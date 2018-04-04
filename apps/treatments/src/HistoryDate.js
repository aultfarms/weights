import React from 'react';
import _ from 'lodash';

import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';

import TreatmentCard from './TreatmentCard';

export default connect({
   historySelector: state`historySelector`,
  treatmentRecords: state`treatments.records`,
            record: state`record`,
}, function HistoryDate(props) {
  // Show cards for current date:
  let recordsfordate = _.filter(props.treatmentRecords, r=>(r.date === props.record.date));
  recordsfordate = _.reverse(_.sortBy(recordsfordate,r=>r.dateLastActivity));

  const count = _.reduce(recordsfordate, (sum,r) => sum + r.tags.length, 0);

  return (
    <div className="history">
      <div className="historytitle">
        {props.record.date+': '+count} head total.
      </div>
      {_.map(recordsfordate, (r,i) => 
        <TreatmentCard key={'treatmentcard'+i}
                       record={_.clone(r)}
                       recordindex={i} />
      )}
    </div>
  );
});

