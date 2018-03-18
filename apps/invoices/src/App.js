import React, { Component } from 'react';
import { connect } from '@cerebral/react';
import { state, signal } from 'cerebral/tags';

import { MuiThemeProvider, Card, CardContent, 
         AppBar, Toolbar, IconButton, Typography,
         Drawer } from 'material-ui';
import { Menu as MenuIcon } from 'material-ui-icons';
import createMuiTheme from 'material-ui/styles/createMuiTheme';
import { withStyles } from 'material-ui/styles';

import InvoiceTabs from './InvoiceTabs';

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
  authorized: state`trello.authorized`,
   feedReady: state`feed.ready`,
        page: state`page`,
          init: signal`init`,
  drawerToggle: signal`drawerToggle`,
}, withStyles(styles, { withTheme: true })(class App extends Component {

  componentWillMount() {
    this.props.init();
  }

  renderAuthorized() {
    if (!this.props.authorized) {
      return <Card><CardContent>Not authorized in Trello yet.</CardContent></Card>;
    }
  }

  renderFeedReady() {
    if (!this.props.feedReady)  {
      return <Card><CardContent>Feed data not ready</CardContent></Card>;
    }
  }

  render() {
    const props = this.props;
    const titleClicked = () => props.drawerToggle();
    return (
      <MuiThemeProvider theme={muitheme}>
        <div className="App">
          <AppBar position="static">
            <Toolbar>
              <IconButton onClick={titleClicked} className={props.classes.menuButton} color="inherit" aria-label="Menu">
                <MenuIcon />
              </IconButton>
              <Typography variant="title" color="inherit" className={props.classes.flex}>
                Feed - {props.page.name}
              </Typography>
            </Toolbar>
          </AppBar>

          <Drawer variant="persistent" anchor='left' open={props.page.drawer.open}>
            
          </Drawer>

          { this.renderAuthorized() }
          { this.renderFeedReady() }

        </div>
      </MuiThemeProvider>
    );
  }
}));

