import React from 'react';
import _ from 'lodash';
import { connect } from '@cerebral/react';
import { state,signal } from 'cerebral/tags';
import { Compute } from 'cerebral';

import Tabs, { Tab } from 'material-ui/Tabs';

const groupData = Compute(
  state`invoicegroups.curgroup`,
  (curgroup,get) => get(state`feed.${curgroup}`),
);

export default connect({
  curgroup: state`invoicegroups.curgroup`,
  groupData, // computed value for current group
  newTabRequested: signal`newTabRequested`,
}, function InvoiceGroup(props) {
  return <Tabs 
    className="invoice-group" 
    value={props.curtab} 
    onChange={val => props.newTabRequested({val})}
  >

    { _.map(props.groupData, (d,name) => <Tab key={'grouptab_'+name} value={name} label={name}/> )}

  </Tabs>
});
