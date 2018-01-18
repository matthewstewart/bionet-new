
var websocket = require('websocket-stream');
var rpc = require('rpc-multistream'); // RPC and multiple streams over one stream
var auth = require('rpc-multiauth'); // authentication

var reconnectDelay = 2;
var reconnectAttempts = 0;
var reconnectAttemptsMax = 10;

function reconnect(cb) {
  if (reconnectAttempts > reconnectAttemptsMax) {
    console.log("Disconnected from server. Gave up trying to reconnect after " + reconnectAttemptsMax + " attempts.", {
      level: 'error',
      time: false
    });
    return;
  }
  var delay = Math.pow(reconnectDelay * reconnectAttempts, 2);
  if (reconnectAttempts) {
    console.log("Disconnected from server. Attempting to reconnect in " + delay + " seconds", {
      level: 'error',
      time: (delay - 1) * 1000
    });
  }
  setTimeout(function() {
    setConnectState(false, "Will attempt to reconnect in " + (delay - 1) + " seconds...", (delay - 1));
  }, 1000);
  console.log("reconnecting in", delay, "seconds");
  setTimeout(function() {
    connect(cb);
  }, delay * 1000);
  reconnectAttempts++;
}


function connector(cb) {

  var failed = false;

  function failOnce(err) {
    if(!failed) {
      console.log('main.js failOnce error:', (typeof err === 'object') ? err.message + ' ' + err.stack : err);
      cb(err);
      failed = true;
    }
  }

  var wsProtocol = 'ws://';
  if(window.location.protocol.match(/^https/i)) {
    wsProtocol = 'wss://';
  }

  var websocketUrl = wsProtocol + window.document.location.host;
  console.log('connecting to websocket', websocketUrl)

  var stream = websocket(websocketUrl);
  stream.on('error', function(err) {
    failOnce(new Error("connection closed"));
  });
  stream.on('close', function() {
    failOnce(new Error("connection closed"));
  });

  // You can turn on debugging like this:
  //   var rpcClient = rpc(null, {debug: true});
  var rpcClient = rpc(null, {
    objectMode: true
  });

  rpcClient.pipe(stream).pipe(rpcClient);

  rpcClient.on('error', function(err) {
    console.log("RPCCLIENT error:", err)
    failOnce(err);
  });

  rpcClient.on('methods', function (remote) {

    // automatically try to authenticate when connecting
    // TODO rpc-multiauth's .athenticate function should pass back the token
    auth.authenticate(remote, {
      setCookie: true
    }, function (err, userData) {

      if(err) {
        cb(null, remote);
      } else {
        cb(null, remote, userData.user);
      }
    });

  });
}

function connect(cb) {
  console.log("attempting to connect");
  connector(function (err, remote, user) {
    if(err) {
      setConnectState(false, "Failed to connect");
      reconnect(cb);
      return;
    }
    setConnectState(true);

    setLoginState(user);

//    if(reconnectAttempts) {
//      console.log("Reconnected!");
//    }

    reconnectAttempts = 0;

    cb(null, remote, user);
  })
}

// TODO we probably should be calling app.actions from index.js
//      instead of from in here
function setConnectState(isConnected, msg, delay) {
  app.actions.connection.setState(isConnected, msg, delay);
}

// TODO we probably should be calling app.actions from index.js
//      instead of from in here
function setLoginState(user, token) {
  if(user) {
    app.actions.user.set(user, token);
  } else {
    app.actions.user.set();
  }
}

function login(email, password, cb) {
  if(!app.remote) return cb(new Error("Not connected"))

  console.log("login initiated:", email, password);

  auth.login(app.remote, {
    email: email,
    password: password
  }, {
    setCookie: true
  }, function (err, token, userData) {
    if(err) return cb(err);

    setLoginState(userData.user, token);

    console.log("login successful! token: " + token + " userData: " + JSON.stringify(userData));

    cb(null, userData.user);

  });
};

function logout(cb) {
  cb = cb || function () {};

  if(!app.remote) return cb(new Error("Not connected"))

  auth.logout(app.remote, function() {

    setLoginState()

    console.log("Logged out.");
    cb();
  });
};


module.exports = {
  login: login,
  logout: logout,
  connect: connect

};
