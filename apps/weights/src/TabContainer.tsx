import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';

import { TabWeights } from './TabWeights';
import { Prefs } from './Prefs';
import { Errors } from './Errors';

import './TabContainer.css';

export const TabContainer = observer(function TabContainer() {
  const ctx = React.useContext(context);
  const { state } = ctx;

  let ret = (<div className='tabscontainer'>Unknown Tab Type</div>);
  switch(state.tabSelector.active) {
    case 'weights': ret = <TabWeights />;  break;
    case   'prefs': ret = <Prefs      />;  break;
    case  'errors': ret = <Errors     />;  break;
    default: ret = <div>Unknown tab {state.tabSelector.active} selected</div>
  }
  return ret;
});

