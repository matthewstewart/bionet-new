import { h } from 'preact';

module.exports = function(Component) {

  return class ContainerNewForm extends Component {

    render() {
      let selectedRecord = this.props.selectedRecord;
      let parentRecord = this.props.parentRecord;
      let children = this.props.selectedRecord.children.map((child, index) => {
        return (
          <div class="container-child">
            Row {child.row}, Col {child.column}: {child.name} 
          </div>
        )
      });
      return (
        <div class="ContainerNewForm">
          <div class="panel-block">
            <div class="columns is-multiline">
              <div class="column is-12">
                <div class="columns is-mobile">
                  <div class="column is-narrow">
                    <label class="label">Name</label>
                  </div>
                  <div class="column">   
                    <input 
                      class="input  "
                      type="text" 
                      placeholder="Container Name"
                    />
                  </div>
                </div>
              </div>
              <div class="column is-12">
                <div class="columns is-gapless">
                  <div class="column is-narrow">
                    <label class="label">Description</label>
                  </div>
                  <div class="column">   
                    <textarea 
                      class="textarea  "
                      rows="2"
                      placeholder="A short description of the Container."
                    ></textarea>
                  </div>
                </div>
              </div>              
              <div class="column is-12">
                <div class="columns is-gapless">
                  <div class="column is-narrow">
                    <label class="label">Row</label>
                  </div>
                  <div class="column">   
                    <input 
                      class="input  "
                      type="number" 
                      min="1"
                    />
                  </div>
                </div>
              </div>
              <div class="column is-12">
                <div class="columns is-gapless">
                  <div class="column is-narrow">
                    <label class="label">Column</label>
                  </div>
                  <div class="column">   
                    <input 
                      class="input  "
                      type="number" 
                      min="1"
                    />
                  </div>
                </div>
              </div>              
            </div> 
          </div>
        </div>
      )
    }
  }
}  