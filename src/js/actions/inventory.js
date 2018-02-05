var self = module.exports = {
    
    getPath: function (n) {
        
        const generateTestItems = function(xunits,yunits) {
            const items=[]
            for (var y=0; y<yunits; y++) {
                for (var x=0; x<xunits; x++) {
                    if ( Math.random() > 0.8 ) {
                        var id = (x+1)+','+(y+1)
                        items.push({id:id,name:id,parent_x:x,parent_y:y})
                    }
                }
            }
            return items
        }
        
        const newPath2 = [
            {name:'lab',child:'freezer',xUnits:1,yUnits:1},
            {name:'freezer',child:'shelf',xUnits:1,yUnits:5},
            {name:'shelf',child:'rack',xUnits:4,yUnits:1},
            {name:'rack',child:'box',xUnits:5,yUnits:4},
            {name:'box',child:'well',xUnits:10,yUnits:10}
        ]
        const newPath = []
        for (var i=0; i<n; i++) {
            var item = newPath2[i]
            item.children = generateTestItems(item.xUnits, item.yUnits)
            newPath.push(item)
        }
        
        app.changeState({
            global: {
                inventoryPath: newPath
            }
        });
        //console.log('getPathTest action %d',n, newPath)
    },
    
    getChildren:function(id, cb) {
        app.remote.getChildren(id, function(err, children) {
            if (err) return console.error(err);
            const ichildren = []
            var ypos=0
            for (var i = 0; i < children.length; i++) {
                var child = children[i]
                if (id === child.value.parent_id) {
                    var value = child.value
                    if (!value.parent_x) value.parent_x = 1
                    if (!value.parent_y) value.parent_y = ypos++
                    ichildren.push(value)
                }
            }
            cb(id, ichildren)
        })
    },
    
    getLocationType: function( type ) {
        const types = app.state.global.inventoryTypes.locations
        for (var i=0; i<types.length; i++) {
            if ( types[i].name === type ) return types[i]
        }
        return null
    },
    
    getInventoryPath: function(id, cb) {
        if (!id) return
        const locationPath = {}
        var results = 0
        app.remote.getLocationPath(id, function (err, locationPathAr) {
            if (err) {
                console.log('getLocationPath error:', err)
                return
            }
            
            app.changeState({
                global: {
                    inventoryLocationPath: locationPathAr
                }
            });
            locationPathAr.reverse()
            
            results = locationPathAr.length
            for (var i = 0; i < locationPathAr.length; i++) {
                var location = locationPathAr[i]
                var locationId = location.id
                var locationType = this.getLocationType(location.type)
                if (locationType) {
                    location.xUnits = locationType.xUnits
                    location.yUnits = locationType.yUnits
                }
                locationPath[locationId] = location
                this.getChildren(locationId, (pid, children) => {
                    locationPath[pid].children = children
                    if (--results <= 0) {
                        app.changeState({
                            global: {
                                inventoryPath: locationPathAr
                            }
                        });
                        if (cb) cb(locationPath)
                    }
                })
            }
        }.bind(this ))
    },
    
    getInventoryTypes: function() {
        
        const dataTypes = app.settings.dataTypes
        //console.log('getInventoryTypes, appSettings:',dataTypes)

        const materials = []
        const locations = []
        for (var i = 0; i < dataTypes.length; i++) {
            const type = dataTypes[i]
            if (type.virtual === true) {
                type.url = '/create-virtual/' + encodeURI(type.name)
                materials.push(type)
            } else {
                type.url = '/create-physical/' + encodeURI(type.name)
                locations.push(type)
            }
        }
        
        const typeSpec = {
            materials: materials,
            locations: locations
        }
        app.setState({
            global: {
                inventoryTypes: typeSpec
            }
        });
        
        const createType = 'storage'
    },
    
    getRootItem: function(cb) {
        var rootItem
        app.remote.inventoryTree(function (err, children) {
            if (err) return console.log("ERROR:", err);
            for (var i = 0; i < children.length; i++) {
                var item = children[i].value
                if (!item.parent_id && item.type === 'lab') {
                    app.changeState({
                        global: {
                            inventoryRoot: item
                        }
                    });
                    if (cb) cb(item)
                    break;
                }
            }
        })
    },
    
    init: function (q) {
        this.getFavorites()
        if (q) {
            this.selectInventoryItem(q)
            return
        }

        const setRootId = function (id) {
            app.changeState({
                global: {
                    inventory: {
                        rootId: id
                    }
                }
            });
        }

        //app.global.inventory
        var rootItem
        BIONET.remote.inventoryTree(function (err, children) {
            if (err) return console.log("ERROR:", err);
            for (var i = 0; i < children.length; i++) {
                var item = children[i].value
                if (!item.parent_id && item.type === 'lab') {
                    setRootId(item.id)
                    rootItem = item
                    this.selectInventoryItem(rootId)
                    break;
                }
            }
        })
    },

    refreshInventoryPath: function (id) {
        console.log('refreshInventoryPath:', id)
        this.retrieveLocationPath(id, (path) => {
            BIONET_VIS.signal.setLocationPath.dispatch(id, path)
            BIONET.signal.getFavorites.dispatch()
            const selectedChildren = getChildTable(path[id].children)
            if (id.indexOf('p->') >= 0 || id.indexOf('v-') >= 0) {
                // todo: set component state
                //tag.editPart(path[id])
                //$('#edititem').show()
            } else {
                BIONET_DATAGRID.updateDataTable(selectedChildren)
                    // set component state
                    //$('#edititem').hide()
            }
        })
    },
    
        
    retrieveLocationPath: function (id, cb) {
        if (!id) return
        const locationPath = {}
        var results = 0
        BIONET.remote.getLocationPath(id, function (err, locationPathAr) {
            if (err) {
                console.log('getLocationPath error:', err)
                return
            }
            results = locationPathAr.length
            for (var i = 0; i < locationPathAr.length; i++) {
                var location = locationPathAr[i]
                var locationId = location.id
                locationPath[locationId] = location
                this.getChildren(locationId, (pid, children) => {
                    locationPath[pid].children = children
                    if (--results <= 0) {
                        cb(locationPath)
                    }
                })
            }
        })
    },

    selectInventoryItem: function (id, selectionModeVis) {
        BIONET.signal.setLayout.dispatch(tag.layout)
        const selectionMode = selectionModeVis || BIONET_VIS.getSelectionMode()
        if (selectionMode === BIONET.EDIT_SELECTION) {
            //editSelection = BIONET_VIS.getEditSelection()
            editSelection = BIONET_VIS.getEditSelection()
            if (editSelection && editSelection.dbData) {
                //if (editSelection.physicalId) {
                if (editSelection.dbData.type === 'physical') {
                    tag.editMaterial()
                } else {
                    tag.editItem()
                        //BIONET.signal.getPhysical.dispatch(id)
                }
                //} else {
                // create new physical and add to parent
                //console.log('selectInventoryItem: create new physical', JSON.stringify(editSelection), id)
                //}
            }
            return
        } else if (selectionMode === BIONET.MOVE_SELECTION) {
            BIONET.signal.highlightItem.dispatch(BIONET_VIS.ZOOM_ITEM, id)
            BIONET_VIS.setMoveItemId(id)
            const currentItem = BIONET_VIS.getSelectedItem()
            console.log('selectInventoryItem: move', id, currentItem)
                /*
                const parentId = currentItem.parent_id
                retrieveLocationPath(parentId, (path) => {
                    BIONET_VIS.signal.setLocationPath.dispatch(parentId, path)
                })
                */
            return
        }

        retrieveLocationPath(id, (path) => {
            //console.log('retrieveLocationPath:', JSON.stringify(path, null, 2))
            BIONET_VIS.signal.setLocationPath.dispatch(id, path)
            const type = BIONET_VIS.getSelectedType()
            const currentItem = BIONET_VIS.getSelectedItem()
            console.log('retrieveLocationPath:', path, type, currentItem)
            if (currentItem) {
                tag.selectedName = currentItem.name
            }
            tag.createType = (type === 'box') ? 'material' : 'storage'
            const selectedChildren = getChildTable(path[id].children)
            updateLayout()
            if (type === 'part' || id.indexOf('v-') >= 0) {
                $('#edititem').show()
                tag.editPart(currentItem.dbData)
            } else {
                $('#edititem').hide()
                BIONET_DATAGRID.updateDataTable(selectedChildren)
                BIONET.signal.getFavorites.dispatch()
            }
            tag.update()
        })
    },

    setSelectionMode: function (e) {

    },

    generatePhysicalsFromUpload: function (result, parent_id) {
        if (!csvData) return
        console.log('generatePhysicalsFromUpload csv:', csvData)
        const instancesList = []
        const lines = csvData.match(/[^\r\n]+/g);
        console.log('generatePhysicalsFromUpload lines:', lines)



        const headerLine = lines[0].match(/[^,]+/g)
        console.log('generatePhysicalsFromUpload headerLine:', headerLine)

        const isBionetBulkData = (headerLine.indexOf('customer_line_item_id') < 0)
        console.log('generatePhysicalsFromUpload: isBionet:', isBionetBulkData)

        const bionetBulkUpload = function () {
            const createVirtual = function (virtualObj, physicalInstances, container_id, well_id) {
                if (!physicalInstances || isNaN(physicalInstances)) return
                app.remote.saveVirtual(virtualObj, function (err, id) {
                    if (err) return app.ui.toast("Error: " + err) // TODO handle error
                    generatePhysicals(virtualObj.name, physicalInstances, container_id, well_id)
                });
            }
            const nameIdx = headerLine.indexOf('Name')
            const typeIdx = headerLine.indexOf('Type')
            const usernameIdx = headerLine.indexOf('Created By')
            const createdDateIdx = headerLine.indexOf('Created')
            const descriptionIdx = headerLine.indexOf('Description')
            const sequenceIdx = headerLine.indexOf('Sequence')
            const instancesIdx = headerLine.indexOf('Physical Instances')
            const genomeIdx = headerLine.indexOf('Genome')
            const wellIdx = headerLine.indexOf('Well')
            if (nameIdx < 0 || typeIdx < 0 || instancesIdx < 0) {
                app.toast('invalid format specified, missing name, type or instances')
                return
            }

            for (var i = 1; i < lines.length; i++) {
                var line = lines[i].match(/[^,]+/g)
                console.log('line:%s', JSON.stringify(line))
                var instances = line[instancesIdx]
                if (!instances || isNaN(instances)) continue
                var seriesName = line[nameIdx]
                var userName = line[usernameIdx]
                var virtualType = line[typeIdx]
                    //const timeCreated = line[createdDateIdx]
                var timeCreated = new Date().toDateString()
                var creator = {
                    user: userName,
                    time: timeCreated
                }
                var updated = {
                    user: userName,
                    time: timeCreated
                }
                var description = line[descriptionIdx]
                var sequence = line[sequenceIdx]
                var genome = line[genomeIdx]
                var well_id = null
                if (wellIdx >= 0) {
                    var well_id_str = line[wellIdx]
                    well_id = wellIdToObj(well_id_str)
                }
                var virtualObj = {
                    name: seriesName,
                    type: virtualType,
                    creator: creator,
                    "creator.user": userName,
                    "creator.time": timeCreated,
                    Description: description,
                    Sequence: sequence,
                    Genome: genome
                }
                createVirtual(virtualObj, instances, container_id, well_id)

                /*

                getPhysicalResult {"name":"myNewVector01_0","type":"physical","parent_id":"p-40f35523-9884-4361-8eae-e97466e7b25d","id":"p-9820ba76-5ff0-4270-bbc3-07079a796b76","created":{"user":"tsakach@gmail.com","time":1499278758},"updated":{"user":"tsakach@gmail.com","time":1499278758}}

                {"type":"vector","name":"myNewVector02","creator":{"user":"tsakach@gmail.com","time":"Wed Jul 05 2017"},"Description":"v02","Sequence":"abba","creator.user":"tsakach@gmail.com","creator.time":"Wed Jul 05 2017","Genotype":"abcd"}"
                */
            }
        }

    },

    generatePhysicalFromGenbankUpload: function (filename, result, parent_id) {
        this.genbankToJson(gbData, function (results) {

            if (!results || !results.length) {
                return app.ui.toast("Error reading file: " + filename);
            }

            var i, data;
            for (i = 0; i < results.length; i++) {
                if (!results[i].success) {
                    console.error("Error:", results.messages);
                    return app.ui.toast("Error reading file: " + filename);
                }
                data = results[i].parsedSequence;

                if (!data || !data.name) {
                    return app.ui.toast("Error reading file: " + filename);
                }

                // if no description, generate description from features
                if (!data.description || !data.description.trim()) {
                    data.description = (data.features) ? data.features.map(function (feat) {
                        return feat.name;
                    }).join(', ') : '';

                }

                var virtualObj = {
                    name: data.name,
                    type: 'vector',
                    Description: data.description,
                    Sequence: data.sequence,
                    filename: filename
                }
                createVirtual(virtualObj, 1, container_id);
            }
        }, {
            isProtein: false
        })
    },

    addFavorite: function (id) {

    },

    getFavorites: function () {
        app.remote.favLocationsTree(function (err, userFavorites) {
            if (err) {
                console.log('get favorites err:', err)
                return
            }
            //todo set getfavorites state
            //BIONET.signal.getFavoritesResult.dispatch(userFavorites)
        })
    },

    virtualSaveResult: function () {

    },
    
    addItem: function(type) {
        
    },
    
    delPhysical: function (id) {

    }
}