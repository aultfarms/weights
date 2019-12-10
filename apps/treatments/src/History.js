import React from 'react';

import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';

import  HistoryDate from './HistoryDate';
import   HistoryTag from './HistoryTag';
import HistoryGroup from './HistoryGroup';
import  HistoryTime from './HistoryTime';
import        Prefs from './Prefs';

import './History.css';

export default connect({
   historySelector: state`historySelector`,
}, function History(props) {
  let ret = (<div className='history'>Unknown History Type</div>);
  switch(props.historySelector.active) {
    case  'date': ret = <HistoryDate />;  break;
    case   'tag': ret = <HistoryTag />;   break;
    case 'group': ret = <HistoryGroup />; break;
    case  'time': ret = <HistoryTime />;  break;
    case 'prefs': ret = <Prefs />;  break;
    default:
  }
  return ret;
});

