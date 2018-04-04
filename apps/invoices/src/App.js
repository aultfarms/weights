import React, { Component } from 'react';
import _ from 'lodash';
import { connect } from '@cerebral/react';
import { state, signal } from 'cerebral/tags';

import { MuiThemeProvider, Card, CardContent, 
         AppBar, Toolbar, IconButton, Typography,
         Drawer } from 'material-ui';
import { Menu as MenuIcon } from 'material-ui-icons';
import { ListItem, ListItemText } from 'material-ui/List';
import List from 'material-ui/List';
import createMuiTheme from 'material-ui/styles/createMuiTheme';
import { withStyles } from 'material-ui/styles';

import InvoiceGroup from './InvoiceGroup';

import './App.css';

const muitheme = createMuiTheme({});

//-----------------------------------------
// Styles:
const styles = theme => ({
  root: { flexGrow: 1, },
  flex: { flex: 1 },
  menuButton: { 
    marginLeft: -12,
    marginRight: 20,
  },
  drawerPaper: {
    position: 'relative',
    width: 240,
  },
});

export default connect({
  authorized: state`trello.authorized`,
   feedReady: state`feed.ready`,
        page: state`page`,
          init: signal`init`,
  drawerToggle: signal`drawerToggle`,
   changeGroup: signal`changeGroup`,
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

  invoiceGroupClicked(group) {
    return () => this.props.changeGroup({group});
  }
  renderDrawer() {
    const props = this.props;
    //if (!props.page.drawer.open) return '';
    return (
      <Drawer variant="persistent" anchor='left' classes={{ paper: props.classes.drawerPaper }} open={props.page.drawer.open}>
        <List>
          { 
            _.map({notInvoiced: 'Not Invoiced', notPaidFor: 'Not Paid For', truckingNotPaid: 'Trucking Not Paid', }, (display,key) => 
              <ListItem button key={key} onClick={this.invoiceGroupClicked(key)}>
                <ListItemText primary={display}/>
              </ListItem>
            )
          }
        </List>
      </Drawer>
    );
  }

  renderInvoiceGroup() {
    const props = this.props;
    if (!props.authorized) return '';
    if (!props.feedReady) return '';
    return <InvoiceGroup/>
  }

  render() {
    const props = this.props;
    const hamburgerClicked = () => props.drawerToggle();
    return (
      <MuiThemeProvider theme={muitheme}>
        <div className="App">
          <AppBar position="static">
            <Toolbar>
              <IconButton onClick={hamburgerClicked} className={props.classes.menuButton} color="inherit" aria-label="Menu">
                <MenuIcon />
              </IconButton>
              <Typography variant="title" color="inherit" className={props.classes.flex}>
                Feed - {props.page.name}
              </Typography>
            </Toolbar>
          </AppBar>
          
          { this.renderDrawer() }

          { this.renderInvoiceGroup() }

          { this.renderAuthorized() }
          { this.renderFeedReady() }

        </div>
      </MuiThemeProvider>
    );
  }
}));

