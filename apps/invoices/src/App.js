import React, { Component } from 'react';
import _ from 'lodash';
import { connect } from '@cerebral/react';
import { state, sequences } from 'cerebral';

import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Drawer from '@material-ui/core/Drawer';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import MenuIcon from '@material-ui/icons/Menu';

import InvoiceGroup from './InvoiceGroup';
import CardErrors from './CardErrors';

import './App.css';

export default connect({
  authorized: state`trello.authorized`,
   feedReady: state`feed.ready`,
        page: state`page`,
          init: sequences`init`,
  drawerToggle: sequences`drawerToggle`,
   changeGroup: sequences`changeGroup`,
}, class App extends Component {

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
    return (
      <Drawer variant="persistent" anchor='left' open={props.page.drawer.open}>
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

  render() {
    //return <div></div>;
    const props = this.props;
    const hamburgerClicked = () => props.drawerToggle();
    return (
      <div className="App">
        <AppBar position="static">
          <Toolbar>
            <IconButton onClick={hamburgerClicked} color="inherit" aria-label="Menu">
              <MenuIcon />
            </IconButton>
            <Typography variant="title" color="inherit" >
              Feed - {props.page.name}
            </Typography>
          </Toolbar>
        </AppBar>
        
        { this.renderDrawer() }

        { props.feedReady ? <CardErrors /> : '' }

        { props.feedReady ? <InvoiceGroup /> : '' }

        { this.renderAuthorized() }
        { this.renderFeedReady() }

      </div>
    );
  }
});

