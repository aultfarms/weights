import React from 'react';

import {connect} from '@cerebral/react';
import {state} from 'cerebral';

import  TabWeights from './TabWeights';
import      TabTag from './TabTag';
import    TabGroup from './TabGroup';
import     TabDead from './TabDead';
import       Prefs from './Prefs';

import './TabContainer.css';

export default connect({
   tabSelector: state`tabSelector`,
}, function TabsContainer(props) {
  let ret = (<div className='tabscontainer'>Unknown Tab Type</div>);
  switch(props.tabSelector.active) {
    case 'weights': ret = <TabWeights />;  break;
    case     'tag': ret = <TabTag     />;   break;
    case   'group': ret = <TabGroup   />; break;
    case    'dead': ret = <TabDead    />;  break;
    case   'prefs': ret = <Prefs      />;  break;
    default:
  }
  return ret;
});

