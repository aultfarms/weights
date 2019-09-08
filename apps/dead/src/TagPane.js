import React from 'react';
import _ from 'lodash';

import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';

import TagBar from './TagBar';
import Msg from './Msg';
import History from './History';
import HistorySelector from './HistorySelector';

import './TagPane.css';

export default connect({
  windowSize: state`windowSize`,
  errors: state`dead.errors`,
}, function TagPane(props) {
  return (
    <div className='tagpane' style={{ height: props.windowSize.orientation === 'landscape' ? '100vh' : '100vw' }}>
      <TagBar />
      <Msg />
      {(!props.errors || props.errors.length < 1) ? '' : 
        <div className='tagpane-errors'>
          {_.map(props.errors, e => 
            <div className='tagpane-error'>
              Error on card: {e.cardName}<br/>
              Error was: <pre>{e.error}</pre>
            </div>
          )}
        </div>
      }
      <HistorySelector />
      <History />
    </div>
   );
});
