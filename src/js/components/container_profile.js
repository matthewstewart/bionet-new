import { h } from 'preact';

module.exports = function(Component) {

  return class ContainerProfile extends Component {

    render() {
      let selectedRecord = this.props.selectedRecord;
      let parentRecord = this.props.parentRecord;
      let children = this.props.selectedRecord.children.map((child, index) => {
        let isContainer = Object.keys(child).indexOf('children') > -1;
        return (
          <a 
            class="panel-block"
            id={child.id}
            onClick={this.props.selectRecord}
          >
            <span class="panel-icon">
              {(isContainer) ? (
                <i class="mdi mdi-grid"></i>
              ) : (
                <i class="mdi mdi-flask"></i>
              )}  
            </span>
            {child.name}: Row {child.row}, Col {child.column} 
          </a>
        )
      });
      return (
        <div class="ContainerProfile">
          <div class="panel-block">
            <div class="columns is-multiline is-gapless">
              <div class="column is-12">
                <div class="columns is-gapless">
                  <div class="column is-narrow">
                    <label class="label">Name</label>
                  </div>
                  <div class="column">   
                    {selectedRecord.name}
                  </div>
                </div>
              </div>
              <div class="column is-12">
                <div class="columns is-gapless">
                  <div class="column is-narrow">
                    <label class="label">Description</label>
                  </div>
                  <div class="column">   
                    {selectedRecord.description}
                  </div>
                </div>
              </div>
              <div class="column is-12">
                <div class="columns is-mobile">
                  <div class="column is-narrow">
                    <label class="label">Location</label>
                  </div>
                  <div class="column">   
                    {parentRecord.name} - Row {selectedRecord.row}, Col {selectedRecord.column}
                  </div>
                </div>
              </div>              
            </div>    
          </div>
          <div class="panel-block">                      
            <div class="columns">
              <div class="column">
                <h5>Content</h5>
              </div>
            </div>
          </div>

          {children}
        </div>
      )
    }
  }
}  