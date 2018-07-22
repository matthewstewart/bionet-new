import {
    h
}
from 'preact'
import ashnazg from 'ashnazg'

module.exports = function (Component) {
    var ActionNavbar = require('./actionNavbar')(Component)
    var InventoryPath = require('./inventoryPath')(Component)

    return class Inventory extends Component {

        constructor(props) {
            super(props);
            this.initialized=false
            app.actions.inventory.initialize()
            this.state={
                types:{},
                inventoryPath:null
            }

          if(props.match.params.virtual_id) {
            this.state.inventoryPath = {
              virtual_id: props.match.params.virtual_id
            }
          }

            ashnazg.listen('global.user', this.loggedInUser.bind(this));
        }
        
        componentWillReceiveProps(props) {
            const id = (props.match) ? props.match.params.id : null
            //console.log('inventory main props:', id, this.state.id, this.props)
            if (id !== this.state.id || app.state.inventory.forceRefresh) this.getInventoryPath(id)

          if(props.match.params.virtual_id) {
            this.setState({
              inventoryPath: {
                virtual_id: props.match.params.virtual_id
              }
            })
          }

          
        }
        
        componentWillMount() {
            this.setState({
                types:app.actions.inventory.getInventoryTypes()
            })
        }
        
        getInventoryPath(id) {
            console.log('inventory.actions.getInventoryPath main, id:',id)
          // TODO can we standardize on: `const self = this` ?
          //      module has no meaning in js or react anyway
            const thisModule=this
            if (id) {
                app.actions.inventory.getInventoryPath(id, function(err, inventoryPath) {
                    //console.log('getInventoryPath2, id:',id)
                    if (err) {
                        thisModule.setState({
                            id:id,
                            inventoryPath:err
                        })
                        return
                    }
                    thisModule.setState({
                        id:id,
                        inventoryPath:inventoryPath
                    })
                })
            } else {
                app.actions.inventory.getRootItem(function(err, rootId) {
                    if (err) {
                        console.log('getRootItem, error:',err)
                        thisModule.setState({
                            id:rootId,
                            inventoryPath:err
                        })
                        return
                    } else {
                        console.log('inventory.actions.getInventoryPath root, id:',id)
                        app.actions.inventory.getInventoryPath(rootId, function(err, inventoryPath){
                            if (err) {
                                app.actions.notify(err.message, 'error');
                                thisModule.setState({
                                    id:rootId,
                                    inventoryPath:err
                                })
                                return
                            }
                            //console.log('getInventoryPath3, rootid:',rootId, thisModule.state, thisModule.props, inventoryPath)
                            thisModule.setState({
                                id:rootId,
                                inventoryPath:inventoryPath
                            })
                        })
                    }
                })
            }
        }
        
        shouldComponentUpdate(nextProps, nextState) {
            const idProp = (nextProps.match) ? nextProps.match.params.id : null
            const idState = nextState.id
            if (app.state.inventory.forceRefresh) {
                //console.log('inventory main, forcing refresh:',nextProps)
                app.state.inventory.forceRefresh=false
                return true
            }
            if (!idProp && idState) return true
            return idState === idProp
        }
        
        loggedInUser(loggedInUser) {
            //console.log('logged in inventory: user', loggedInUser, app.remote, this.initialized)
            if (!loggedInUser) {
                return
            }
            this.initialized=true
            app.actions.inventory.getInventoryTypes()
            app.actions.inventory.getFavorites()
            app.actions.inventory.getWorkbenchContainer()
            const id = (this.props.match) ? this.props.match.params.id : null
            this.getInventoryPath(id)
        }
        
        componentDidMount() {
            if (!this.state.inventoryPath) {
                this.loggedInUser(app.state.global.user)
            }
        }
        
        render() {
            console.log('inventory index.js render',this.state.inventoryPath)
            if (!app.state.global.user) {
                console.log('inventory index.js not logged in',this.state.inventoryPath)
                // todo: this message could be displayed for reasons other than not having a logged in user
                return null
                /*
                return (
                    <div>You must be logged in to view this page.</div>
                )
                */
            }

            return (
                <InventoryPath state="inventoryPath" id={this.state.id} inventoryPath={this.state.inventoryPath}/>
            )
        }
    }
}
