import { h } from 'preact'
import { Link } from 'react-router-dom';
import ashnazg from 'ashnazg'
import LocationPath from './LocationPath'
import EditContainer from './EditContainer'
import ContainerPropertiesForm from './ContainerPropertiesForm'

module.exports = function (Component) {

    const StorageContainer = require('./storageContainer')(Component)
    const EditPhysical = require('./editPhysical')(Component)
    const PrintLabel = require('../print')(Component)
    const ScanLabel = require('../scan')(Component)
    const EditTable = require('./editTable')(Component)
    const Workbench = require('./workbench')(Component)

    const DataPanel = require('../data_panel.js')(Component);
    const MapPanel = require('../map_panel.js')(Component);
    const LabPanel = require('../lab_panel.js')(Component);
    
    const NEW_MODE_PHYSICAL_STEP1 = 1
    const NEW_MODE_PHYSICAL_STEP2 = 2
    const NEW_MODE_CONTAINER = 3


    return class InventoryPath extends Component {
        constructor(props) {
            super(props);
            //console.log('view props:', JSON.stringify(props))
            const currentItem = app.actions.inventory.getLastPathItem()
            this.state = {
                inventoryPathRendered:null,
                inventoryItem:{},
                containerSize:150,
                attributes:{},
                navMode:'navigate',
                editMode:false,
                newMode:false,
                suggestMode:false,
                toggleEditItem:false,
                toggleNewItem:false,
                currentItem:currentItem,
                fullWidth:false,
                isFavorites:false,
                favorites:app.state.favorites
            }

          if(props.inventoryPath && props.inventoryPath.virtual_id) {
            this.state.newMode = NEW_MODE_PHYSICAL_STEP2;
            this.state.virtualID = props.inventoryPath.virtual_id;
          }
        }

        componentWillReceiveProps(props) {
            if (!props.inventoryPath) return
            //if (!props.inventoryPath || props.id===this.state.id) return
          const currentItem = app.actions.inventory.getItemFromInventoryPath(props.id)
            //if (this.state.newMode===NEW_MODE_PHYSICAL_STEP2) this.toggleEditMode()
            this.setState({
                id: props.id,
                currentItem:currentItem,
                inventoryPath: props.inventoryPath
            });
        }
        
        componentDidMount() {
            this.setState({favorites:app.state.favorites})
        }
        
        initZoom(panelWidth,layoutWidth) {
            const zoom = panelWidth/layoutWidth
            return isNaN(zoom) ? 1.0 : zoom
        }
        
        print() {
          const path = this.props.inventoryPath
          if (!path || path.length<1) return null
          const item = path[path.length-1]
          if (!item) return
          const id = item.id
          const name = item.name
          const callback = function(err, labelImageData, labelData) {
            //console.log('print callback')
            item.label = labelData;
            app.actions.inventory.saveToInventory(item, labelImageData, true, function(err) {
              if(err) return app.actions.notify(err, "error");
              app.actions.notify("Label is printing!");
            })
          }

          const promptComponent = (<PrintLabel callback={callback} item={item}/>)

          app.actions.prompt.display('Print label for '+name+'?', promptComponent, function(accept) {
            //console.log('print item:',accept)
            if (accept) {
            }
          })
        }
        
        addFavorite() {
            const item=this.state.currentItem
            if (!item) return
            const self=this
            app.actions.inventory.addFavorite(item, function(err) {
                if (err) {
                    app.actions.notify(err.message, 'error');
                    return
                }
                else {
                    app.actions.notify(item.name+" added to favorites", 'notice', 2000);
                    app.actions.inventory.getFavorites( (err,favorites) => {
                        self.setState({
                            favorites:favorites
                        })
                    })
                }
            })
        }
        
        navigateParent(e) {
            const path = this.props.inventoryPath
            const selectedItem = path[path.length-1]
            if (!selectedItem) return null
            app.actions.inventory.selectInventoryId(selectedItem.parent_id)
        }
        
        onFormType(formType) {
            const newMode = (formType==='Physical') ? NEW_MODE_PHYSICAL_STEP1 : NEW_MODE_CONTAINER
            this.setState({
                newMode:newMode,
                formType:formType
            })
        }
        
        toggleNewMode() {
            if (this.state.isFavorites) {
                this.addFavorite()
            } else {
                if (this.state.newMode) {
                    this.setState({
                        newMode:false,
                        location:null,
                        layoutWidthUnits:null,
                        layoutHeightUnits:null,
                        majorGridLine:null,
                        recordLocation:null
                    })
                } else {
                    const newMode = (this.state.formType==='Physical') ? NEW_MODE_PHYSICAL_STEP1 : NEW_MODE_CONTAINER
                    this.setState({
                        newMode:newMode,
                        location:null
                    })
                }
            }
        }
        
        toggleFavoritesMode(isFavorites) {
            this.setState({isFavorites:isFavorites})
        }
        
        onSaveNew(dbData, type) {
            if (type==='physical') this.onSaveNewPhysical(dbData)
            else this.onSaveNewContainer(dbData)
        }
        
        onSaveNewContainer(item) {
            console.log('onSaveNewContainer:',item)
            if (!this.state.currentItem) return
            const parentId = this.state.currentItem.id 
            item.parent_id = parentId
            app.actions.inventory.saveToInventory(item,null,null,function(err,id){
                app.actions.notify(item.name+" saved", 'notice', 2000);
                console.log('onSaveNewContainer, saveToInventory:',err,id)
                app.actions.inventory.refreshInventoryPath(parentId)
            }.bind(this))
        }
        
        onSaveNewPhysical(dbData) {
            const instances = dbData.instances
            const thisModule=this
            const parentId = this.props.id
            console.log('inventoryPath onSaveNew:',dbData, instances)
            delete dbData.instances
            const currentItem=this.state.currentItem
            var children = (currentItem) ? currentItem.children : null
            var childCells={}
            if (children) {
                for (var i=0; i<children.length; i++) {
                    var child=children[i]
                    var index=child.parent_x+','+child.parent_y
                    childCells[index]=child.id
                }
            }
            const containerLayout = app.actions.inventory.initContainerProps(currentItem,currentItem.id,this.state.editPanelWidth,1,true)
            const rows = containerLayout.layoutHeightUnits
            const cols = containerLayout.layoutWidthUnits

            const emptyCellArray=[]
            for (var row=1; row<=rows; row++) {
                for (var col=1; col<=cols; col++) {
                    var index=col+','+row
                    if (!childCells[index]) emptyCellArray.push({parent_y:row,parent_x:col})
                }
            }
            console.log('inventoryPath onSaveNew: list',rows,cols,emptyCellArray, childCells, containerLayout)
            
            app.actions.inventory.saveVirtual(dbData, function(err, virtual_id) {
                if (err) {
                    app.actions.notify(err.message, 'error');
                    return
                }
                console.log('onSaveNew saveVirtual result, ',virtual_id)
                dbData.id = virtual_id
                app.actions.notify(dbData.name+" created", 'notice', 2000);
                
                app.actions.inventory.generatePhysicals(virtual_id, dbData.name, instances, parentId, emptyCellArray, dbData.color, function(err, physicals) {
                    if (err) {
                        app.actions.notify(err.message, 'error');
                        return
                    }
                    const mergedPhysicals = (children && children.length && children.length>0 ) ? physicals.concat(children) : physicals
                    currentItem.children=mergedPhysicals
                    //console.log('onSaveNew: new physicals:',mergedPhysicals,currentItem)
                    app.actions.notify("New physical saved", 'notice', 2000);
                    app.actions.inventory.refreshInventoryPath(currentItem.id)
                })
            })
        }
        
        onAssignNew(data) {
            console.log('inventoryPath onSaveNew:',data)
            this.setState({newMode:false})
        }
        
        toggleEditMode() {
            if (this.state.editMode) {
                console.log('inventoryPath, toggleEditMode refreshing inventory path')
                app.actions.inventory.refreshInventoryPath(this.state.id)
            }
            this.setState({
                editMode:!this.state.editMode,
                layoutWidthUnits:null,
                layoutHeightUnits:null,
                majorGridLine:null,
                recordLocation:null
            })
        }
        
        toggleFullscreenMode(fullWidth) {
            console.log('toggleFullscreenMode:',fullWidth)
            this.setState({fullWidth:fullWidth})
        }
        
        toggleEditItemMode() {
            this.setState({toggleEditItem:!this.state.toggleEditItem})
        }

        onSaveEdit(props) {
            if (!props) return
            delete props.validation
            console.log('inventoryPath onSaveEdit:', props)
            app.actions.inventory.updateItem(props.id, function(err, item) {
                props.xUnits = (props.xUnits) ? Number(props.xUnits) : 1
                props.yUnits = (props.yUnits) ? Number(props.yUnits) : 1
                const updatedItem = Object.assign(item, props)
                /*
                const gridWidth=(props.gridWidth) ? props.gridWidth : 40
                const gridHeight=(props.gridHeight) ? props.gridHeight : 40
                props.layoutWidthUnits = xUnits,
                props.layoutWidth = gridWidth*xUnits
                props.layoutHeightUnits = yUnits,
                props.layoutHeight = gridHeight*yUnits
                */
                delete updatedItem.gridWidth
                delete updatedItem.gridHeight
                delete updatedItem.layoutWidth
                delete updatedItem.layoutHeight
                delete updatedItem.layoutWidthUnits
                delete updatedItem.layoutHeightUnits
                console.log('inventoryPath onSaveEdit updateItem', updatedItem, item, props)
                app.actions.notify(item.name+" saved", 'notice', 2000);
                return updatedItem
            })
        }
        onDelete() {
            const item=this.state.currentItem
            if (!item) return
            const id = item.id
            if (!id) return
            const name = item.name
            const parentId = item.parent_id
            console.log('deleting item 1:', id, name, parentId, item)
            app.actions.prompt.display('Do you wish to delete '+name+'?', null, function(accept) {
                if (accept) {
                    app.actions.inventory.delPhysical(id, function(err,id2) {
                        if (err) {
                            app.actions.notify(err.message, 'error');
                            return
                        }
                        app.actions.notify(name+" deleted", 'notice', 2000);
                    })
                    app.actions.inventory.refreshInventoryPath(parentId)
                }
            }.bind(this))
        }

        onChangeItemProperties(props) {
            if (!this.state.currentItem) return
            const currentItem = this.state.currentItem
            if (currentItem.type==='physical') {
                console.log('inventoryPath onChangeItemProperties physical:',props)
            } else {
                console.log('inventoryPath onChangeItemProperties container:',props)
                if (props.xUnits) {
                    this.setState({layoutWidthUnits:props.xUnits})
                } else if (props.yUnits) {
                    this.setState({layoutHeightUnits:props.yUnits})
                } else if (props.majorGridLine) {
                    this.setState({majorGridLine:props.majorGridLine})
                }
            }
        }
        
        onEditPanelMount(width,height) {
            const id= (this.state.id) ? this.state.id : 'no selected record '
            console.log('onEditPanelMount:',id,width,height)
            this.setState({editPanelWidth:width,editPanelHeight:height})
        }
        onNavPanelMount(width,height) {
            console.log('inventoryPath, onNavPanelMount:',width,height)
            this.setState({mapPanelWidth:width,mapPanelHeight:height})
        }
        onRecordEnter(id) {
            //console.log('inventoryPath onRecordEnter:',id)
            this.setState({
                highlightedRecord:id
            })
        }
        onRecordLeave(id) {
            //console.log('inventoryPath onRecordLeave:',id)
            this.setState({
                highlightedRecord:null
            })
        }
        onToggleEditItem() {
            this.setState({
                toggleEditItem:!this.state.toggleEditItem
            })
        }
        onToggleNewItem() {
            console.log('inventoryPath onToggleNewItem')
            this.setState({
                toggleNewItem:!this.state.toggleNewItem
            })
        }
        onSelectItem(item) {
            this.setState({
                selectedItem:item
            })
        }
        onRecordLocation(item) {
            this.setState({
                recordLocation:item
            })
        }
        onCopyWorkbench(e) {
            console.log('onCopyWorkbench :',this.state.currentItem)
        }
        render() {
            console.log('inventoryPath render',this.props.id, this.props.inventoryPath)
            if (!this.props.inventoryPath || !this.props.id) return
            const inventoryPath=this.props.inventoryPath
            const currentItem=app.actions.inventory.getItemFromInventoryPath(this.props.id)
            if (!currentItem || !inventoryPath) return

            if (typeof inventoryPath === 'object' && inventoryPath.constructor.name === 'Error') {
                console.log('inventoryPath error',typeof inventoryPath === 'object', inventoryPath)
                return (
                    <h6 style="margin-top:15px;">{inventoryPath.message}</h6>
                )
            }
            
            var childItems = (currentItem) ? currentItem.children : null
            const attributes = app.actions.inventory.getAttributesForType(currentItem.type)
      
            //const pathMaxHeight = "height: "+this.state.containerSize+"px;margin:0;padding:0;"
            const pathMaxHeight = "margin:0;padding:0;"

            const selectedItemElements = (this.state.selectedItem) ? this.state.selectedItem.items : null        
            const tableHeight =  window.innerHeight-this.state.containerSize-100
            
            var dataItems = {}
            if (this.state.editMode) {
                dataItems=(<ContainerPropertiesForm
                            name={currentItem.name}
                            width={currentItem.layoutWidthUnits}
                            height={currentItem.layoutHeightUnits}
                            majorGridLine={currentItem.majorGridLine}
                            units={currentItem.units}
                            onChange={this.onChangeItemProperties.bind(this)}
                        />)

            } else {
                /*
                dataItems=(
                    <div className="pure-form">
                        <div style={{marginTop:'20px'}}/>
                        <label>Name:</label>{currentItem.name}<br/>
                        <label>Description:</label>{currentItem.description}<br/>
                        <label>Width:</label>{currentItem.layoutWidthUnits}<br/>
                        <label>Height:</label>{currentItem.layoutHeightUnits}<br/>
                        <label>Units:</label>{currentItem.units}<br/>
                        <label>Grid Line:</label>{currentItem.majorGridLine}<br/>
                        <div style={{marginTop:'20px'}}/>
                        <EditTable state="edittable" item={currentItem} items={childItems} height={tableHeight} attributes={attributes}/>
                    </div>
                )
                */
            }

            var dataPanel=null
            var navPanel=null
            var editPanel=null
            const breadcrumbs = inventoryPath.map(container => {
                return {
                    id:container.id,
                    name:container.name
                }
            })
            const selectRecord=function(e) {
                app.actions.inventory.refreshInventoryPath(e.target.id)
            }
            const parentRecord=app.actions.inventory.getItemFromInventoryPath(currentItem.parent_id)
            if (this.state.editMode) {
                var fullWidth=this.state.fullWidth
                if (currentItem.type==='lab') fullWidth=true
                const pathId={}
                var zoomIndex=1
                var location=null
                if (this.state.location) {
                    location=Object.assign(this.state.location,{})
                    pathId[location.id]=location.name
                } else {
                    const newPath=this.props.inventoryPath
                    const id=this.state.id
                    newPath.map(container => {
                        pathId[container.id]=container.name
                    })
                    for (var i=0; i<newPath.length; i++) {
                        location=Object.assign(newPath[i],{})
                        if (location.id===id) {
                            break
                        }
                    }
                }
                
                if (!location) return
                var editPanelClass='is-12-desktop'
                if (!fullWidth) {
                    editPanelClass='is-5-desktop'
                    dataPanel = (
                            <div class="column is-7-desktop">
                              <DataPanel 
                                {...this.state}
                                virtualID={this.state.virtualID}
                                selectedRecord={currentItem}
                                breadcrumbs={breadcrumbs}
                                parentRecord={parentRecord}
                                selectRecord={selectRecord}
                                fullWidth={fullWidth}
                                onFormType={this.onFormType.bind(this)}
                                toggleNewMode={this.toggleNewMode.bind(this)}
                                toggleEditMode={this.toggleEditMode.bind(this)}
                                toggleFullscreenMode={this.toggleFullscreenMode.bind(this)}
                                onSaveEdit={this.onSaveEdit.bind(this)}
                                onSaveNew={this.onSaveNew.bind(this)}
                                onDelete={this.onDelete.bind(this)}
                                onRecordEnter={this.onRecordEnter.bind(this)}
                                onRecordLeave={this.onRecordLeave.bind(this)}
                                onChange={this.onChangeItemProperties.bind(this)}
                                recordLocation={this.state.recordLocation}
                                >
                                {dataItems}
                            </DataPanel>
                        </div>
                    )
                }
                if (this.state.layoutWidthUnits) location.layoutWidthUnits = this.state.layoutWidthUnits
                if (this.state.layoutHeightUnits) location.layoutHeightUnits = this.state.layoutHeightUnits
                if (this.state.majorGridLine) location.majorGridLine = this.state.majorGridLine

                const containerLayout = app.actions.inventory.initContainerProps(location,pathId,this.state.editPanelWidth,1)
                const zoom = this.initZoom(this.state.editPanelWidth,containerLayout.layoutWidth)
                //console.log('inventoryPath render, zoom:',zoom,this.state.layoutWidthUnits)

                if (fullWidth) {
                    editPanel = (
                        <div class={'column '+editPanelClass}>
                          <LabPanel
                            {...this.state}
                            selectedRecord={currentItem}
                            fullWidth={fullWidth}
                            toggleEditMode={this.toggleEditMode.bind(this)}
                            toggleEditItemMode={this.onToggleEditItem.bind(this)}
                            toggleFullscreenMode={this.toggleFullscreenMode.bind(this)}
                            toggleNewMode={this.onToggleNewItem.bind(this)}
                            parentRecord={{}}
                            >
                                <EditContainer
                                    container={containerLayout}
                                    items={containerLayout.items}
                                    width={this.state.editPanelWidth}
                                    height={this.state.editPanelHeight}
                                    zoom={zoom}
                                    fullWidth={fullWidth}
                                    editItem={this.state.toggleEditItem}
                                    newItem={this.state.toggleNewItem}
                                    onMount={this.onEditPanelMount.bind(this)}
                                    onToggleEdit={this.onToggleEditItem.bind(this)}
                                    onToggleNew={this.onToggleNewItem.bind(this)}
                                />
                          </LabPanel>
                        </div>
                    )
                } else {
                    editPanel = (
                        <div class={'column '+editPanelClass}>
                          <MapPanel
                            {...this.state}
                            selectedRecord={currentItem}
                            toggleEditMode={this.toggleEditMode.bind(this)}
                            parentRecord={{}}
                            >
                                <div id="inventory_tiles" class="tile">
                                    <div class="tile is-vertical">
                                        <div id="inventory_path" class="tile is-parent" style={pathMaxHeight}>
                                            <EditContainer
                                                container={containerLayout}
                                                items={containerLayout.items}
                                                width={this.state.editPanelWidth}
                                                height={this.state.editPanelHeight}
                                                zoom={zoom}
                                                fullWidth={false}
                                                onMount={this.onEditPanelMount.bind(this)}
                                                editItem={this.state.toggleEditItem}
                                                newItem={this.state.toggleNewItem}
                                                onToggleEdit={this.onToggleEditItem.bind(this)}
                                                onToggleNew={this.onToggleNewItem.bind(this)}
                                            />
                                        </div>
                                    </div>
                                </div>
                          </MapPanel>
                        </div>
                    )
                }
            } else {
                
                const width=this.props.width
                const pathId={}
                const newPath=this.props.inventoryPath
                const containerId = (currentItem.type==='physical') ? currentItem.parent_id : currentItem.id
                newPath.map(container => {
                    pathId[container.id]=container.name
                })
                var rootZoom=1.0
                const initZoom=this.initZoom
                //console.log('inventoryPath, nav:',currentItem.name,currentItem.type,containerId)
                var panelWidth=this.state.mapPanelWidth
                var panelHeight=this.state.mapPanelHeight
                var zoomWidth = Math.min(200,this.state.mapPanelWidth)
                var zoomHeight = this.state.mapPanelHeight
                var rootLocation=null
                var rootContainer=null
                var rootHeight=200
                if (currentItem.type!=='lab') {
                    const rootPath2 = newPath.map(container => {
                        if (container.type==='lab') {
                            const containerLayout=app.actions.inventory.initContainerProps(container,pathId,width,1)
                            rootZoom = initZoom(zoomWidth,containerLayout.layoutWidth)
                            rootHeight = containerLayout.layoutHeight*rootZoom
                            zoomHeight -= rootHeight+20
                            rootContainer=containerLayout
                            return containerLayout
                        }
                    })
                    const rootPath = rootPath2.filter(container => { return container })
                    if (this.state.highlightedRecord) console.log('baseDisplayObject, highlighted',this.state.highlightedRecord)
                    rootLocation = (
                        <div>
                            <LocationPath
                                path={rootPath}
                                container={rootContainer}
                                width={zoomWidth}
                                height={zoomHeight}
                                zoom={rootZoom}
                                gridEnabled={false}
                                borderEnabled={true}
                                highlightedRecord={this.state.highlightedRecord}
                            />
                            <br/>
                        </div>
                    )
                }
                
                var newItem=null
                var zoom=1.0
                var itemContainer=null
                const locationPath2 = newPath.map(container => {
                    if (containerId===container.id) {
                        const containerLayout=app.actions.inventory.initContainerProps(container,pathId,width,1)
                        if (containerLayout.layoutWidth >= containerLayout.layoutHeight) {
                            zoom = initZoom(panelWidth,containerLayout.layoutWidth)
                        } else {
                            zoom = initZoom(panelHeight-rootHeight-60,containerLayout.layoutHeight)
                        }
                        itemContainer=containerLayout
                        return containerLayout
                    }
                })
                const locationPath = locationPath2.filter(container => { return container })
                const favorites=this.state.favorites
                dataPanel = (
                        <div class="column is-7-desktop">
                          <DataPanel 
                            {...this.state}
                            selectedRecord={currentItem}
                            breadcrumbs={breadcrumbs}
                            parentRecord={parentRecord}
                            selectRecord={selectRecord}
                            newMode={this.state.newMode}
                            fullWidth={fullWidth}
                            onFormType={this.onFormType.bind(this)}
                            toggleNewMode={this.toggleNewMode.bind(this)}
                            toggleEditMode={this.toggleEditMode.bind(this)}
                            toggleFullscreenMode={this.toggleFullscreenMode.bind(this)}
                            toggleFavoritesMode={this.toggleFavoritesMode.bind(this)}
                            onDelete={this.onDelete.bind(this)}
                            onSaveEdit={this.onSaveEdit.bind(this)}
                            onSaveNew={this.onSaveNew.bind(this)}
                            favorites={favorites}
                            onRecordEnter={this.onRecordEnter.bind(this)}
                            onRecordLeave={this.onRecordLeave.bind(this)}
                            >
                            {dataItems}
                            {newItem}
                        </DataPanel>
                    </div>
                )
                var locationPathComponent=null
                if (this.state.newMode===NEW_MODE_CONTAINER) {
                    rootLocation=null
                    locationPathComponent=(
                        <EditContainer
                            container={itemContainer}
                            items={itemContainer.items}
                            width={this.state.editPanelWidth}
                            height={this.state.editPanelHeight}
                            zoom={zoom}
                            fullWidth={false}
                            onMount={this.onEditPanelMount.bind(this)}
                            editItem={this.state.toggleEditItem}
                            newItem={this.state.toggleNewItem}
                            onToggleEdit={this.onToggleEditItem.bind(this)}
                            onToggleNew={this.onToggleNewItem.bind(this)}
                            onRecordLocation={this.onRecordLocation.bind(this)}
                        />
                    )
                } else {
                    locationPathComponent=(
                        <LocationPath
                            path={locationPath}
                            container={itemContainer}
                            width={this.state.mapPanelWidth}
                            height={zoomHeight}
                            zoom={zoom}
                            gridEnabled={true}
                            borderEnabled={false}
                            highlightedRecord={this.state.highlightedRecord}
                            onCopyWorkbench={this.onCopyWorkbench}
                        />
                    )
                }
                if(this.state.suggestMode) {

                  var suggestResults;

                  if(this.state.suggestMode.loading) {
                    suggestResults = (
                      <p>Loading...</p>
                    )
                  } else if(!this.state.suggestMode.results.length) {
                    suggestResults = (
                      <p>No matches</p>
                    )
                  } else {
                    var results = [];
                    var i, res;
                    for(i=0; i < this.state.suggestMode.results.length; i++) {
                      res = this.state.suggestMode.results[i];
                      results.push((
                        <li>
                          <Link to={'/inventory/new/'+res.value.id}>{res.value.name}</Link>
                        </li>
                      ));
                    }

                    suggestResults = (
                      <div>
                        <ul>{results}</ul>
                      </div>
                    );
                  }

                  navPanel = (
                    <div class="column is-5-desktop">
                      <div id="map-panel" class="MapPanel panel has-background-white">
                        <div className="panel-heading">
                          <span>Suggesting</span>
                        </div>
                        <div className="panel-block">
                          {suggestResults}
                        </div>
                      </div>
                    </div>
                  )
                } else {
                  navPanel = (
                    <div class="column is-5-desktop">
                      <MapPanel
                        {...this.state}
                        selectedRecord={currentItem}
                        parentRecord={{}}
                        onMount={this.onNavPanelMount.bind(this)}
                        >
                            <div id="inventory_tiles" class="tile">
                                <div class="tile is-vertical">
                                    <div id="inventory_path" class="tile is-vertical" style={pathMaxHeight}>
                                        {rootLocation}
                                        {locationPathComponent}
                                    </div>
                                </div>
                            </div>
                      </MapPanel>
                    </div>
                  )
                }
            }
            return (
                <div class="LabInventory">
                  <div id="panel-container" class="columns is-desktop">
                    {dataPanel}
                    {navPanel}
                    {editPanel}
                  </div>
                </div>
                
            )
        }
    }
}
