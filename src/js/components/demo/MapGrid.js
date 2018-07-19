import {h} from 'preact';
import { Link } from 'react-router-dom';

module.exports = function(Component) {

  return class MapGrid extends Component {

    constructor(props){
      super(props);
      this.onRecordEnter = this.onRecordEnter.bind(this);
      this.onRecordLeave = this.onRecordLeave.bind(this);
    }

    onRecordEnter(e) {
      let recordId = e.target.getAttribute('id');
      console.log(`entered ${recordId}`);
      this.props.setHoveredRecord(recordId);
    }

    onRecordLeave(e) {
      let recordId = e.target.getAttribute('id');
      console.log(`left ${recordId}`);
      this.props.setHoveredRecord(null);
    }

    render() {
      let containerStyles = {
        'gridTemplateColumns': '',
        'gridTemplateRows': ''
      };
      const record = this.props.record;
      const recordColumns = record.layoutWidthUnits;
      const recordRows = record.layoutHeightUnits;
      const selectedRecord = this.props.selectedRecord;
      const hoveredRecord = this.props.hoveredRecord;
      for(let i = 0; i < recordColumns; i++){
        containerStyles.gridTemplateColumns += '1fr';
        if(i !== (recordColumns - 1)) {
          containerStyles.gridTemplateColumns += ' ';
        }
      }
      for(let i = 0; i < recordRows; i++){
        containerStyles.gridTemplateRows += '1fr';
        if(i !== (recordRows - 1)) {
          containerStyles.gridTemplateRows += ' ';
        }
      }

    
      let childElements = [];
      if(record && record.children && selectedRecord){
        
        // get total number of cells in grid
        let cellCount = recordRows * recordColumns;

        // fill childElements array with empty cells
        for(let i = 0; i < cellCount;i++){
          childElements.push(
            <div class="empty grid-item">
              <div class="grid-item-label"></div>
            </div>
          );  
        }

        // replace empty cells with positioned children
        // for(let i = 0; i < record.children.length; i++){
        //   let childRecord = record.children[i];
        //   // get position of current child record based on its relationship with parent size
        //   let childIndex = ((childRecord.row * recordColumns) - recordColumns) + childRecord.column - 1;
        //   // replace empty with child
        //   let classNames = childRecord && this.props.selectedRecord && this.props.hoveredRecord && childRecord.id === this.props.selectedRecord.id || 
        //     childRecord.id === this.props.hoveredRecord.id ? "active grid-item" : "grid-item";

        //   childElements[childIndex] = (
        //     <Link 
        //       to={`/ui/lab-inventory/${childRecord.id}`} 
        //       class={classNames}
        //       id={`${childRecord.id}`}
        //       onClick={this.props.selectRecord}
        //       onMouseEnter={this.onRecordEnter}
        //       onMouseLeave={this.onRecordLeave}                
        //     >
        //       <div 
        //         class="grid-item-label"
        //         id={`${childRecord.id}`}
        //       >
        //         {childRecord.name}
        //       </div>
        //     </Link>
        //   );
      
        // }

        // replace with children by position
        // childElements = record.children.map((child, index) => {
        //   return (
        //     <div class="grid-item">
        //       {child.name}
        //     </div>
        //   );
        // });
      }

      // add emptys

      return (
        <div class="MapGrid">
          {(childElements) ? (
            <div class="grid-container" style={containerStyles}>
              {childElements}
            </div>
          ) : null }
        </div>
      )
    }
  } 
}
