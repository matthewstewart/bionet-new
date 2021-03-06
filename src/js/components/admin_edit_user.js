
import {h} from 'preact';
import {Link} from 'react-router-dom';
import linkState from 'linkstate';
import util from '../util.js';

module.exports = function(Component) {

  var AccessDenied = require('./access_denied.js')(Component);
  var Loading = require('./loading.js')(Component);

  return class AdminEditUser extends Component {
   
    constructor(props) {
      super(props);

      this.state = {
        user: undefined
      };

      util.whenConnected(this.onConnected.bind(this));
    };

    sendPasswordReset() {
      if(!this.state.user || !this.state.user.username) {
        app.actions.notify("No username specified. Could not reset password", 'error');
        return;
      }
      app.actions.user.passwordReset(this.state.user.username, function(err) {
        if(err) {
          app.actions.notify("Error resetting password", 'error');
          console.error(err);
          return;
        }
        app.actions.notify("Password reset email sent", 'success');
      });
    };

    saveUser(e) {
      e.preventDefault();

      app.actions.user.save(this.state.user.username, this.state.user, function(err) {
        if(err) {
          this.changeState({
            error: this.state.error
          });
          return;
        }
        app.actions.notify("User updated successfully", 'success');
      });
    }

    onConnected() {

      var username = this.props.match.params.username;
      if(!username) {
        this.changeState({
          user: undefined
        });
      }

      app.actions.user.get(this.props.match.params.username, function(err, user) {
        if(err) {
          this.changeState({
            error: this.state.error
          });
          return;
        }
        this.changeState({
          user: user
        });
      }.bind(this));
    };

        
	  render() {
      var user = app.state.global.user;
      if(!user) {
        return (<AccessDenied />);
      } else if(!util.user.isInGroup('admin')) {
        return (<AccessDenied group="admin" />);
      }

      if(this.state.error) {
        return (
            <div>
            Error: {this.state.error.message}
          </div>
        );
      }

      if(!this.state.user) {
        return (
          <Loading />
        );
      }
      
      return (
        <div>
          <div>
            <h3>User: {this.state.user.username}</h3>
          </div>
          <div>
            <form onsubmit={this.saveUser.bind(this)}>
              <p>
                Email: <input class="input" type="text" value={this.state.user.email} oninput={linkState(this, 'user.email')} />
              </p>
              <p>
                Password: <input class="input" type="password" oninput={linkState(this, 'user.password')} />
                Confirm password: <input class="input" type="password" oninput={linkState(this, 'user.password_confirm')} />
              </p>
              <input type="submit" value="Save" />
            </form>
            <p>
              <a href="#" onclick={this.sendPasswordReset.bind(this)}>Send password reset email</a>
            </p>
            <p>
              <Link to={"/admin/delete-user/"+encodeURIComponent(this.state.user.username)}>Delete user</Link>
            </p>
            <p>
              <Link to="/admin">Back</Link>
            </p>
          </div>
        </div>
      )
    }
  }
}
