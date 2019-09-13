import React from 'react';
import _ from 'lodash';
import moment from 'moment';

import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';
import {tagHelpers} from 'aultfarms-lib/util';

export default connect({
   historySelector: state`historySelector`,
  treatmentRecords: state`treatments.records`,
   incomingRecords: state`incoming.records`,
      deadTagIndex: state`dead.tagIndex`,
            record: state`record`,
}, function HistoryTag(props) {
  const record = props.record;
  // tag needs to be valid before we do anything:
  if (!record.tag || !record.tag.color || !record.tag.number) return '';
  // find all records with this tag in it:
  const group = tagHelpers.groupForTag(props.incomingRecords, record.tag, record.date);
  let recordsfortag = _.filter(props.treatmentRecords, r => _.find(r.tags, t => {
      if (!(t.number===record.tag.number && t.color===record.tag.color)) return false;
      const g = tagHelpers.groupForTag(props.incomingRecords, t, r.date);
      if (g.groupname !== group.groupname) return false;
      return true;
  }));

  recordsfortag = _.reverse(_.sortBy(recordsfortag,r=>r.date));
  let prevdays = -1; // keeps track of previous days in mapper
  const tagstr = tagHelpers.tagObjToStr(record.tag);
  // The dead.tagIndex looks like: { tagstr: { groupname: 'date' } }
  let alreadydeaddate = false;
  if (record.group.groupname && props.deadTagIndex[tagstr]) {
    alreadydeaddate = props.deadTagIndex[tagstr][record.group.groupname];
  }
  return (
    <div className="historytag">
      <div className="historyheader">
         {recordsfortag.length} Treatments
         {record.group?', '+record.group.groupname:''}
      </div>
      {(alreadydeaddate ? <div className="historyerror">Already died on {alreadydeaddate}!</div> : '')}
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

