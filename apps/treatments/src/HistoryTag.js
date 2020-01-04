import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { tagHelpers } from 'aultfarms-lib/util'

import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';

export default connect({
   historySelector: state`historySelector`,
  treatmentRecords: state`treatments.records`,
            record: state`record`,
          incoming: state`incoming`,
}, function HistoryTag(props) {
  // find all records with this tag in it:
  const taggroup = tagHelpers.groupForTag(props.incoming.records, props.record.tag, props.record.date);
console.log('taggroup = ', taggroup, ', tag = ', props.record.tag);
  let recordsfortag = _.filter(props.treatmentRecords, r => {
    return _.find(r.tags, t => {
      // must be the same tag color/number
      if (!(t.number===props.record.tag.number && t.color===props.record.tag.color)) {
        return false;
      }
      // tag number and color matches, check group;
      const group = tagHelpers.groupForTag(props.incoming.records, t, r.date);
      if (!taggroup && !group) return true; // both have no group
      if (!taggroup &&  group) return false;// have one
      if ( taggroup && !group) return false;// but not the other
      return (taggroup.groupname === group.groupname);
    });
  });
  recordsfortag = _.reverse(_.sortBy(recordsfortag,r=>r.date));
console.log('recordsfortag = ', recordsfortag);
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

