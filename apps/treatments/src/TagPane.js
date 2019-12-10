import React from 'react';

import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';

import TagBar from './TagBar';
import Msg from './Msg';
import History from './History';
import HistorySelector from './HistorySelector';

import './TagPane.css';

export default connect({
  windowSize: state`windowSize`,
  historySelector: state`historySelector`,
}, function TagPane(props) {
  let maxHeight = '98vh';
  const active = props.historySelector.active;
  if (props.windowSize.orientation === 'portrait' && active !== 'group' && active !== 'time') {
    maxHeight = '49vh';
  }
  return (
    <div className='tagpane' style={{ maxHeight }}> 
      <TagBar />
      <Msg />
      <HistorySelector />
      <History />
    </div>
   );
});
