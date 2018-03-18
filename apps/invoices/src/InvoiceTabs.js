import React from 'react';
import { connect } from '@cerebral/react';
import { state,signal } from 'cerebral/tags';

import { Tabs } from 'material-ui';

export default connect({
  curtab: state`invoicetabs.curtab`,
  newTabRequested: signal`newTabRequested`,
}, props => 
  <Tabs 
    className="invoice-tabs" 
    value={props.curtab} 
    onChange={val => props.newTabRequested({val})}
  >

  </Tabs>
);
