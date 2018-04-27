import { h } from 'preact'
import ashnazg from 'ashnazg'

module.exports = function (Component) {
    
    const EditPhysical = require('./editPhysical')(Component)
    
    return class EditTable extends Component {
        constructor(props) {
            super(props);
            this.rowRef={}
            this.deselectRows.bind(this)
        }
        
        componentWillMount() {
            if (app.state.inventory.listener) app.state.inventory.listener.editCell = this.updateRow.bind(this)
            //console.log('EditTable props:',JSON.stringify(this.props.item,null,2),JSON.stringify(this.props.items,null,2))
        }
        
        tabularHeader() {
            const items = this.props.items
            if (!items || items.length<1) return null
            const headerTitle=[]
            headerTitle.push({name:'Nav',class:'is-1'})
            headerTitle.push({name:'Name',class:'is-4'})
            headerTitle.push({name:'Type',class:'is-3'})
            headerTitle.push({name:'Well',class:'is-1'})
            const type = items[0].type
            if (type==='physical') {
                headerTitle.push({name:'Virtual',class:'is-1'})
            }
            //const attributes = (type) ? app.actions.inventory.getAttributesForType(type) : []
            var attributes = this.props.attributes
            if (!attributes) attributes = (type) ? app.actions.inventory.getAttributesForType(type) : []
            //
            for (var i=0; i<attributes.length; i++) {
                var fieldId = attributes[i].name.toLowerCase()
                var label = fieldId.charAt(0).toUpperCase() + fieldId.slice(1);
                headerTitle.push({name:label,class:'is-3'})
            }
            const headers=[]
            for (var i=0; i<headerTitle.length; i++) {
                var header = headerTitle[i]
                 headers.push(<div class={"tile is-child "+header.class} style={(i===0)?"padding-left: calc(0.625em - 1px);":""}>{header.name}</div>)
            }
            this.headerTitle = headerTitle
            
            return(
                <div class="tile is-parent is-11"  style="padding:0; margin:0;font-weight:800">{headers}</div>
            )
        }
        
        updateTabularData() {
            const selectedItem = this.props.item
            const items = this.props.items
            const headerTitle = this.headerTitle
            //console.log('updateTabularData:',items, selectedItem)
            this.rowRef={}
            const thisModule = this
            
            if (!selectedItem || !items || items.length<1) {
                return (<div className="empty-table" style="padding-left: calc(0.625em - 1px)">{selectedItem.name} is empty.</div>)
            }
            const tabularData=[]
            const ref=(row) => { if (row) thisModule.rowRef[row.props.id] = row; }
            for (var i=0; i<items.length; i++) {
                var item = items[i]
                tabularData.push(<EditPhysical state="EditPhysicalTable" ref={ref} active="true" tabular="true" item={item} id={item.id} classProps={headerTitle} onFocus={thisModule.deselectRows.bind(thisModule)}/>)
            }
            return tabularData
        }
    
        updateRow(selection) {
            if (this.props.mode!=='edit') return
            for(var id in this.rowRef){
                var ref = this.rowRef[id]
                ref.updateSelection(selection)
            }
        }
                                 
        deselectRows(selectedId) {
            //console.log('deselectRows:',this.rowRef, selectedId)
            const occupied = {}
            for(var id in this.rowRef){
                var ref = this.rowRef[id]
                if (ref) {
                    const hasFocus = selectedId === ref.props.id
                    ref.focus(hasFocus, false)
                    const label=ref.getLabel()
                    occupied[label]=ref.props.item
                }
            }
            if (app.state.inventory.listener.editContainerListener) app.state.inventory.listener.editContainerListener(occupied)
        }

        render() {
            //console.log(this.state.inventoryPath)
            const tabularHeader = this.tabularHeader()
            const tabularData = this.updateTabularData()
            //const tableStyle = "margin:0;padding:0;max-height:"+this.props.height+"px;overflow-y:auto;box-sizing:initial;"
            const tableStyle=""
            
            return (
                <div id="inventory_table" class="tile is-parent" style="margin:0;padding:0;box-sizing:initial">
                    <div id="i1" class="" style={tableStyle}>
                        {tabularHeader}
                        {tabularData}
                    </div>
                </div>
            )
        }
    }
}
