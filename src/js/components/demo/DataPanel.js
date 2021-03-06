import { h } from 'preact';
import { Link } from 'react-router-dom';

module.exports = function(Component) {

  const ContainerProfile = require('./ContainerProfile.js')(Component);
  const ContainerNewForm = require('./ContainerNewForm.js')(Component);
  const ContainerEditForm = require('./ContainerEditForm.js')(Component);
  const PhysicalProfile = require('./PhysicalProfile.js')(Component);
  const PhysicalNewForm = require('./PhysicalNewForm.js')(Component);
  const PhysicalEditForm = require('./PhysicalEditForm.js')(Component);

  return class DataPanel extends Component {
  

    // for demo toggle
    // a record must have some type of attribute
    // in persistence that can be toggled true/false
    constructor(props) {
      super(props);
      this.state = {
        isFavorite: false
      };
      this.toggleFavorite = this.toggleFavorite.bind(this);
    }

    toggleFavorite() {
      this.setState({
        isFavorite: !this.state.isFavorite
      });
    }

    render() {

      <li class="is-active">{this.props.selectedRecord.name}</li>
        
      let isViewMode = !this.props.editMode && !this.props.newMode;
      let isEditMode = this.props.editMode === true;
      let isNewMode = this.props.newMode === true;
      let selectedRecord = this.props.selectedRecord;
      
      //let isContainer = Object.keys(selectedRecord).indexOf('children') > -1;
      let isContainer = selectedRecord.layoutHeightUnits && selectedRecord.layoutWidthUnits && selectedRecord.layoutHeightUnits > 1 && selectedRecord.layoutWidthUnits > 1;


      let headingIcon = isContainer ? (<i class="mdi mdi-grid"></i>) : (<i class="mdi mdi-flask"></i>);
      const breadcrumbs = this.props.inventoryPath.map((item, index) => {
        const itemIsContainer = Object.keys(item).indexOf('children') > -1;
        return (
          <li>
            <Link 
              to={`/ui/inventory/${item.id}`}
            >
              {item.name}
            </Link>
          </li>
        );
      });

      return (
        <div class="DataPanel panel has-background-white">
          <div class="panel-heading is-capitalized">
            <div class="is-block">
              <div class="columns is-gapless">
                <div class="column">
                  
                  {(isViewMode) ? (
                    <span>{headingIcon} {this.props.selectedRecord.name}</span>
                  ) : null }

                  {(isNewMode && isContainer) ? (
                    <span>New {this.state.formType || "Item"} In {this.props.selectedRecord.name}</span>
                  ) : null }

                  {(isNewMode && !isContainer) ? (
                    <span>New Instances Of {this.props.selectedRecord.name}</span>
                  ) : null }

                  {(isEditMode) ? (
                    <span>Edit {this.props.selectedRecord.name}</span>
                  ) : null }

                  {(isViewMode) ? (
                    <div class="toolbox is-pulled-right">
                      <div class="buttons has-addons">
                        
                        {(this.state.isFavorite) ? (
                          <span 
                            class="button is-small is-warning has-text-white"
                            onClick={this.toggleFavorite}
                          >
                            <i class="mdi mdi-star"></i>
                          </span>
                        ) : (
                          <span 
                            class="button is-small"
                            onClick={this.toggleFavorite}
                          >
                            <i class="mdi mdi-star-outline"></i>
                          </span>
                        )}

                        <span 
                          class="button is-small is-success"
                          onClick={this.props.toggleNewMode}
                        >
                          <i class="mdi mdi-plus"></i>
                        </span>
                        <span 
                          class="button is-small is-link"
                          onClick={this.props.toggleEditMode}
                        >
                          <i class="mdi mdi-pencil"></i>
                        </span>
                      </div>
                    </div>
                  ) : null }

                  {(isNewMode) ? (
                    <div class="toolbox is-pulled-right">
                      <div class="buttons has-addons">
                        <span 
                           class="button is-small"
                          onClick={this.props.toggleNewMode}
                        >
                          <i class="mdi mdi-arrow-left-bold"></i>
                        </span>
                        <span 
                          class="button is-small is-success"
                          onClick={this.props.onSaveNewClick}
                        >
                          <i class="mdi mdi-content-save"></i>
                        </span>
                      </div>
                    </div>                    
                  ): null }

                  {(isEditMode) ? (
                    <div class="toolbox is-pulled-right">
                      <div class="buttons has-addons">
                        <span 
                          class="button is-small"
                          onClick={this.props.toggleEditMode}
                        >
                          <i class="mdi mdi-arrow-left-bold"></i>
                        </span>
                        <span 
                          class="button is-small is-success"
                          onClick={this.props.onSaveEditClick}
                        >
                          <i class="mdi mdi-content-save"></i>
                        </span>
                        <span 
                          class="button is-small is-danger"
                          onClick={this.props.onDeleteClick}
                        >
                          <i class="mdi mdi-delete-variant"></i>
                        </span>
                      </div>
                    </div>                    
                  ): null }

                </div>
              </div>    
            </div>
          </div>

          <div class="panel-block">
              <nav class="breadcrumb is-capitalized" aria-label="breadcrumbs">
                <ul>
                  { breadcrumbs }
                </ul>
              </nav>
          </div>
          <div>
            {(isViewMode && isContainer) ? (
              <ContainerProfile 
                {...this.props}
                setHoveredRecord={this.props.setHoveredRecord}
              />
            ) : null }
            {(isViewMode && !isContainer) ? (
              <PhysicalProfile 
                {...this.props}
                selectRecord={this.props.selectRecord}
              />
            ) : null }
            {(isNewMode && isContainer) ? (
              <div>
                <div class="panel-block">
                  <div class="columns">
                    <div class="column is-12">
                      <div class="columns is-mobile">
                        <div class="column is-narrow">
                          <label class="label">New</label>
                        </div>
                        <div class="column">   
                          <div class="select">
                            <select 
                              class="is-small"
                              onChange={this.props.setFormType}
                              value={this.props.formType}
                            >
                              <option value="">Select One</option>
                              <option value="Container">Container</option>
                              <option value="Physical">Physical</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {(this.props.formType === 'Container') ? (
                  <ContainerNewForm 
                    {...this.props}
                  />
                ) : null }
                {(this.props.formType === 'Physical') ? (
                  <PhysicalNewForm 
                  {...this.props}
                />
              ) : null }
              </div>
            ) : null }
            {(isNewMode && !isContainer) ? (
              <span>New Instance Form</span>
            ) : null}
            {(isEditMode) ? (
              <div>
                {(isContainer) ? (
                  <ContainerEditForm 
                    {...this.props}
                  />
                ) : (
                  <PhysicalEditForm 
                    {...this.props}
                  />
                )}  
              </div>
            ) : null }
              
          </div>
        </div>
      )
    }
  }
}