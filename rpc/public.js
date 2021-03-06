
var through = require('through2');
var rpc = require('rpc-multistream'); // rpc and stream multiplexing
var validations = require('../common/validations.js');
var uuid = require('uuid').v4;
var xtend = require('xtend');

module.exports = function(settings, users, accounts, db, index, mailer, p2p, pandadoc) { 
  return {
      
    getInventoryRoot: function(curUser, cb) {
        index.inventoryTree.getRoot(function(err, path, key) {
            cb(err, path, key)
        });
    },

    getPeerInfo: function(curUser, cb) {
      cb(null, {
        id: settings.baseUrl,
        hostname: settings.hostname,
        port: settings.port,
        name: settings.lab,
        position: settings.physicalPosition
      });
    },

    getStatus: function(curUser, cb) {
      var peers = [];
      var o, peerId, peer;
      for(peerId in p2p.connector.peers) {
        peer = p2p.connector.peers[peerId];
        if(!peer.connected) continue;
        o = {};
        
        o.name = peer.name;
        o.url = peer.url;
        o.who_initiated_connection = peer.incoming ? 'they did' : 'we did';
        peers.push(o);
      }

      
      cb(null, {
        name: settings.lab || 'unnamed node',
        hostname: settings.hostname,
        port: settings.port,
        baseUrl: settings.baseUrl,
        peers: peers
      });
    },

    // This is a function used by other programs 
    // to test that un-authenticated RPC calls are working.
    foo: function(curUser, cb) {
      cb(null, "bar");
    },

    checkMasterPassword: function(curUser, password, cb) {

      if(password != settings.userSignupPassword) {
        return cb("Invalid master password");
      }
      cb();
    },
    
    createUser: function(curUser, username, email, password, opts, cb) {
      if(typeof opts === 'function') {
        cb = opts;
        opts = {};
      }

      vOpts = {
        humanReadable: true
      };

      if(curUser) {
        // TODO put this check in re-usable function
        // admins don't need a check for master password
        if(curUser.user.groups && curUser.user.groups.indexOf('admin') >= 0) {
          vOpts.ignore = ['masterPassword'];
        } else {
          if(settings.userSignupPassword) {
            if(opts.masterPassword != settings.userSignupPassword) {
              return cb("Invalid master signup password");
            }
          }
        }
      }

      var errors = validations.serverCheck({
        username: username,
        email: email,
        password: password,
        masterPassword: opts.masterPassword
      }, validations.signup, vOpts);
      if(errors) {
        return cb(new Error(errors));
      }

      if(settings.userSignupPassword) {
        if(opts.masterPassword !== settings.userSignupPassword) {
          return cb(new Error("Wrong master password"));
        }
      }
      
      var user = {
        username: username,
        email: email
      };

      accounts.create(users, user, password, mailer, function(err) {
        if(err) {
          return cb(err);
        }

        db.ensureUserData(users, user, accounts, cb)
     });
    }, 

    getRequestStatus: function(curUser, pandadocID, cb) {
      pandadoc.getDocumentStatus(pandadocID, function(err, status) {
        if(err) return cb(err);
        
        cb(null, status);
      });
    },

    getRequest: function(curUser, key, cb) {
      db.request.get(key, function(err, data) {
        if(err) return cb(err);
        
        if(!data.pandadocID) return cb(null, data);

        pandadoc.getDocumentDetails(data.pandadocID, function(err, details) {
          if(err) return cb(null, data);

          cb(null, data, details);
        });
      });
    },

    createRequest: function(curUser, virtual_id, data, cb) {

      db.virtual.get(virtual_id, function(err, virtual) {
        if(err) return cb(err);

        // index by most recent first
        var now = (new Date).getTime();
        var dKey = (Number.MAX_SAFE_INTEGER - now).toString() + uuid();
        
        var req = xtend(data, {
          status: 'requested',
          virtual_id: virtual.id,
          virtualName: virtual.name,
          time: now
        });        

        db.request.put(dKey, req, function(err) {
          if(err) return cb(err);
          
          mailer.sendMaterialRequest(virtual, dKey, data.email, data.shippingAddress, data.name, data.orgName, data.msg, function(err, info) {
            if(err) return cb(err);
            
            cb(null, data, dKey)
          });
        });
      });
    },

    // stream of search results for virtuals
    searchVirtuals: rpc.syncReadStream(function(curUser, q, opts) {
      var opts = opts || {};
      var s = db.virtual.createReadStream({keyEncoding: 'utf8', valueEncoding: 'json'});

      if(!q || !q.trim()) {
        return through.obj(function(data, enc, next) {
          next(null, null);
        });
      }

      var skipped = 0;
      var pushed = 0;
      var results = s.pipe(through.obj(function(data, enc, next) {

        if((data.value.name && data.value.name.toLowerCase().match(q.toLowerCase())) || (data.value.Description && data.value.Description.toLowerCase().match(q.toLowerCase()))) {
          // skip stuff beginning with underscore
          if(data.value.name && data.value.name[0] === '_') {
            return next();
          }

          if(opts.includeAvailability || opts.onlyAvailable) {
            this.push(data);
          } else { // we're doing the filtering for pagination (if any)
            if(!opts.offset && !opts.maxResults) { // no pagination filtering
              this.push(data);
            } else { // do pagination filtering
              if(opts.offset && skipped < opts.offset) {
                skipped++;
                next();
                return;
              }
              if(opts.maxResults && pushed >= opts.maxResults) {
                return next(null, null); // end stream
              }
              this.push(data);
              pushed++;
            }
          }
        }
        next();

      }));

     
      if(!opts.includeAvailability && !opts.onlyAvailable) {
        return results;
      }

      return results.pipe(through.obj(function(obj, enc, next) {
        db.doesVirtualHaveInstance(obj.key, function(err, hasInstance) {
          if(err) return next(err);

          
          if(!opts.onlyAvailable || hasInstance) {
            obj.value.hasInstance = hasInstance;

            if(!opts.offset && !opts.maxResults) { // no pagination filtering
              this.push(obj);

            } else { // do pagination filtering
              if(opts.offset && skipped < opts.offset) {

                skipped++;
                next();
                return;
              }
              if(opts.maxResults && pushed >= opts.maxResults) {
                return next(null, null); // end stream
              }

              this.push(obj);
              pushed++;
            }
          }
          next();
        }.bind(this));
      }));
    }),

    // This actually searches physicals
    searchPhysicals: rpc.syncReadStream(function(curUser, q, opts) {
      var opts = opts || {};
      var s = db.physical.createReadStream({valueEncoding: 'json'});

      return s.pipe(through.obj(function(data, enc, next) {
        if((data.value.name && data.value.name.toLowerCase().match(q.toLowerCase())) || (data.value.description && data.value.description.toLowerCase().match(q.toLowerCase()))) {
          // skip stuff beginning with underscore
          if(data.value.name && data.value.name[0] === '_') {
            return next();
          }

          this.push(data);
        }
        next();
      }));

    }),

    // TODO use indexes for this!
    getByHumanID: function(curUser, humanID, cb) {

      var s = db.bio.createReadStream({valueEncoding: 'json'});
      var found = false;
      var out = s.pipe(through.obj(function(data, enc, next) {
        if(!data || !data.value || !data.value.label) return next()

        console.log("HUMAN ID:", humanID);
        if(data.value.label.humanID == humanID) {
          found = true;
          cb(null, data.value);
        } else {
          next();
        }
      }));
      
      s.on('end', function() {
        if(!found) {
          found = true;
          cb(null, null);
        }
      });

      s.on('error', function(err) {
        if(!found) {
          found = true;
          cb(err);
        }
      });
    },
    

    verifyUser: function(curUser, code, cb) {
      accounts.verify(users, code, cb);
    }, 

    requestPasswordReset: function(curUser, emailOrName, cb) {
      accounts.requestPasswordReset(users, mailer, emailOrName, cb);
    }, 

    checkPasswordResetCode: function(curUser, resetCode, cb) {
      accounts.checkPasswordResetCode(users, resetCode, cb);
    },

    completePasswordReset: function(curUser, resetCode, password, cb) {
      accounts.completePasswordReset(users, resetCode, password, cb);
    },

    // TODO should be unified with `blast` call below
    blastStream: rpc.syncReadStream(function(curUser, query, opts) {
      opts = opts || {}
      if(!index.blast) return cb(new Error("BLAST queries not supported by this node"));

      // should only virtuals that have physicals be returned?
      if(opts.includeAvailability || opts.onlyAvailable) {

        var s = index.blast.query(query, opts)

        return s.pipe(through.obj(function(obj, enc, next) {
          
          db.doesVirtualHaveInstance(obj.key, function(err, hasInstance) {
            if(err) return next(err);
            
            if(!opts.onlyAvailable || hasInstance) {
              obj.value.hasInstance = hasInstance;
              
              this.push(obj);
            }
            
            next();
            
          }.bind(this));
        }));
      }

      return index.blast.query(query, opts);
    }),

    blast: function(curUser, query, opts, cb) {
      opts = opts || {}
      if(!index.blast) return cb(new Error("BLAST queries not supported by this node"));

      // should only virtuals that have physicals be returned?
      if(opts.includeAvailability || opts.onlyAvailable) {

        index.blast.query(query, opts, function(err, metadata, stream) {
          if(err) return cb(err);

          // if we are filtering then we won't know the total number of hits
          if(opts.onlyAvailable) metadata.hits = undefined;

          var outStream = through.obj(function(obj, enc, cb) {

            db.doesVirtualHaveInstance(obj.key, function(err, hasInstance) {
              if(err) return cb(err);

              if(!opts.onlyAvailable || hasInstance) {
                obj.value.hasInstance = hasInstance;

                this.push(obj);
              }

              cb();

            }.bind(this));
          }, function() {
            // TODO why is this necessary?
            outStream.emit('end');
          });
          
          stream.pipe(outStream);

          cb(null, metadata, outStream);
        });
        return;
      }

      index.blast.query(query, opts, cb);
    },

    peerSearch: rpc.syncReadStream(function(curUser, methodName, query, opts) {
      opts = opts || {}
      var out = through.obj();
      if(!p2p) {
        out.emit('error', new Error("p2p not supported by this node"));
        return out;
      }

      var began = 0;
      var queriesSent = 0;

      // for each connected peer
      p2p.connector.peerDo(function(peer, next) {
        if(!peer.remote[methodName]) {
          return next();
        }

        var s = peer.remote[methodName](query, opts);
        queriesSent++;
        began++;

        s.on('error', function() {
          s.destroy();
        });

        s.on('data', function(data) {
          data.peerInfo = {
            id: peer.id,
            name: peer.name,
            position: peer.position,
            distance: peer.distance
          };
          out.write(data);
        });

        s.on('end', function() {
          s.destroy();
          began--;
          if(began <= 0) {
            out.end();
          }
        });
      }, function(err) {
        if(err) out.emit('error', err);
        if(!queriesSent) {
          out.end();
        }
      });
      return out;
    }),

    get: function(curUser, id, cb) {

      var first = id[0];
      var curdb;
      if(first === 'p') {
        curdb = db.physical;
      } else if(first === 'v') {
        curdb = db.virtual;
      } else {
        return cb(new Error("Unknown material class"));
      }
      curdb.get(id, {valueEncoding: 'json'}, function(err, p) {
        if(err) return cb(err);
        cb(null, p);
      });
    },

    // get all physical instances of a virtual
    // TODO create an index for this
    instancesOfVirtual: function(curUser, virtual_id, cb) {
      db.instancesOfVirtual(virtual_id, cb);
    },

    // TODO should have some kind of validation / security / rate limiting
    requestLocalMaterial: function(curUser, id, requesterEmail, physicalAddress, name, org, msg, cb) {

      db.virtual.get(id, function(err, m) {
        if(err) return cb(err);

        mailer.sendMaterialRequest(m, requesterEmail, physicalAddress, name, org, msg, cb);
      });
    }

  }
}
