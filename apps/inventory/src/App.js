import React, { Component } from 'react';
import { connect } from '@cerebral/react';
import { state, signal } from 'cerebral/tags';

import { MuiThemeProvider, Card, CardContent, 
         AppBar, Toolbar, /* IconButton ,*/ Typography,
         /*Drawer*/ } from 'material-ui';
//import { Menu as MenuIcon } from 'material-ui-icons';
import createMuiTheme from 'material-ui/styles/createMuiTheme';
import { withStyles } from 'material-ui/styles';

import './App.css';

const muitheme = createMuiTheme({});

//-----------------------------------------
// Styles:
const styles = {
  root: { flexGrow: 1, },
  flex: { flex: 1 },
  menuButton: { 
    marginLeft: -12,
    marginRight: 20,
  },
};

export default connect({
  trelloAuthorized: state`trello.authorized`,
  googleAuthorized: state`google.authorized`,
    livestockReady: state`livestock.ready`,
              init: signal`init`,

}, withStyles(styles, { withTheme: true })(class App extends Component {

  componentWillMount() {
    this.props.init();
  }

  renderTrelloAuthorized() {
    if (!this.props.trelloAuthorized) {
      return <Card><CardContent>Not authorized in Trello yet.</CardContent></Card>;
    }
  }
  renderGoogleAuthorized() {
    if (!this.props.googleAuthorized) {
      return <Card><CardContent>Not authorized in Google yet.</CardContent></Card>;
    }
  }

  renderLivestockReady() {
    if (!this.props.livestockReady)  {
      return <Card><CardContent>Livestock data not ready</CardContent></Card>;
    }
  }

  render() {
    const props = this.props;
    return (
      <MuiThemeProvider theme={muitheme}>
        <div className="App">
          <AppBar position="static">
            <Toolbar>
              {/*<IconButton onClick={titleClicked} className={props.classes.menuButton} color="inherit" aria-label="Menu">
                <MenuIcon />
              </IconButton> */}
              <Typography variant="title" color="inherit" className={props.classes.flex}>
                Livestock Inventory
              </Typography>
            </Toolbar>
          </AppBar>

          { this.renderTrelloAuthorized() }
          { this.renderGoogleAuthorized() }
          { this.renderLivestockReady() }

        </div>
      </MuiThemeProvider>
    );
  }
}));

