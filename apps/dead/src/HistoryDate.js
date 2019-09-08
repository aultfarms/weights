import React from 'react';
import _ from 'lodash';

import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';

import DeadCard from './DeadCard';

export default connect({
   historySelector: state`historySelector`,
       deadRecords: state`dead.records`,
            record: state`record`,
}, function HistoryDate(props) {
  // Show cards for current date:
  let recordfordate = _.find(props.deadRecords, r=>(r.date === props.record.date));
  if (!recordfordate) recordfordate = props.record;

  return (
    <div className="history">
      <div className="historytitle">
        {recordfordate.date+': '+(recordfordate && recordfordate.tags ? recordfordate.tags.length : '0')} head total.
      </div>
      <DeadCard record={recordfordate} />
    </div>
  );
});

