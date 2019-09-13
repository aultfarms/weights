import React from 'react';
import FontAwesome from 'react-fontawesome';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral/tags';

import './HistorySelector.css';

export default connect({
  historySelector: state`historySelector`,
  historySelectionChangeRequested: sequences`historySelectionChangeRequested`,
}, function HistorySelector(props) {
  const prefsClicked = evt => props.historySelectionChangeRequested({ active: 'prefs' });
  const  dateClicked = evt => props.historySelectionChangeRequested({ active: 'date' });
  const   tagClicked = evt => props.historySelectionChangeRequested({ active: 'tag' });
  const groupClicked = evt => props.historySelectionChangeRequested({ active: 'group' });
  const  timeClicked = evt => props.historySelectionChangeRequested({ active: 'time' });

  return (
    <div className="historyselector">
      <div className={'historyselectorbutton ' + (props.historySelector.active === 'prefs' ? 'historyselectorbuttonactive' : '')}
           onClick={prefsClicked}>
        <FontAwesome name='bars' />
      </div>
      <div className={'historyselectorbutton ' + (props.historySelector.active === 'date' ? 'historyselectorbuttonactive' : '')}
           onClick={dateClicked}>
        Date
      </div>
      <div className={'historyselectorbutton ' + (props.historySelector.active === 'tag' ? 'historyselectorbuttonactive' : '')}
           onClick={tagClicked}>
        Tag
      </div>
      <div className={'historyselectorbutton ' + (props.historySelector.active === 'group' ? 'historyselectorbuttonactive' : '')}
           onClick={groupClicked}>
        Group
      </div>
      <div className={'historyselectorbutton ' + (props.historySelector.active === 'time' ? 'historyselectorbuttonactive' : '')}
           onClick={timeClicked}>
        Time
      </div>

    </div>
  );

});

