import React from 'react';
import _ from 'lodash';
import moment from 'moment';

import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';

export default connect({
   historySelector: state`historySelector`,
  treatmentRecords: state`treatments.records`,
            record: state`record`,
}, function HistoryTag(props) {
  // find all records with this tag in it:
  let recordsfortag = _.filter(props.treatmentRecords, r =>{
    return _.find(r.tags, t => 
      (t.number===props.record.tag.number && t.color===props.record.tag.color)
    );}
  );
  recordsfortag = _.reverse(_.sortBy(recordsfortag,r=>r.date));
  let prevdays = -1; // keeps track of previous days in mapper
  return (
    <div className="historytag">
      {_.map(recordsfortag, (r,i) => {
        const days = moment().diff(moment(r.date,'YYYY-MM-DD'), 'days');
        let daystr = days + ' days ago';
        if (days === 0) daystr = 'today';
        if (days === 1) daystr = 'yesterday';
        let prevstr = '(+'+(days-prevdays)+')';
        if (prevdays < 0) prevstr = '';
        prevdays = days;
        return (
        <div className="historytagentry" key={'historyline'+i}>
          <div className="historytreatment">
            {r.treatment}
          </div>
          <div className="historyduration">
            { daystr } { prevstr }
          </div>
        </div>
      )})}
    </div>
  );
});

