import React from 'react';
import _ from 'lodash';
import moment from 'moment';

import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';

import {tagHelpers} from 'aultfarms-lib/util';

import CalfCard from './CalfCard';

export default connect({
    historySelector: state`historySelector`,
        deadRecords: state`dead.records`,
    incomingRecords: state`incoming.records`,
   treatmentRecords: state`treatments.records`,
            record: state`record`,
}, function HistoryDate(props) {
  // Show cards for current date:
  let recordfordate = _.find(props.deadRecords, r=>(r.date === props.record.date));
  if (!recordfordate) recordfordate = props.record;

  // Compute the initial list of records, with the proper group for each tag:
  const allgroups = {};
  let calves = _.map(recordfordate.tags, t => {
    // group needs list of groups, tag, and an "as-of" date
    const group = tagHelpers.groupForTag(props.incomingRecords, t, recordfordate.date);
    allgroups[group.groupname] = _.cloneDeep(group);
    return {
      tag: t,
      treatments: [],
      group: _.cloneDeep(group),
    };
  });

  // Now, use the "all groups" to do a pre-sort on the treatments list
  // This points out that I have no good way to determine the "end" date of a tag...
  const mindate = _.reduce(allgroups, (curmin,g) => {
    const d = moment(g.date,'YYYY-MM-DD');
    if (d.isBefore(curmin)) return d;
    return curmin;
  }, moment());
  const alltreatments = _.filter(props.treatmentRecords, t => moment(t.date).isAfter(mindate));
  // Loop over each dead calf and find treatments it received:
  calves = _.map(calves, c => {
    // A treatment record has an array of tags for a given date/treatment:
    c.treatments = _.filter(alltreatments, tr => {
      const tagInTreatmentRecord = _.find(tr.tags, 
        t => (t.number === c.tag.number && t.color === c.tag.color)
      );
      // If tag from dead record is not in this treatment record, discard treatment:
      if (!tagInTreatmentRecord) return false;
      // If tag matches, but is from a different group, discard treatment:
      const g = tagHelpers.groupForTag(props.incomingRecords, tagInTreatmentRecord, tr.date);
      if (g.groupname !== c.group.groupname) return false; // not same group
      return true; // keep this treatment, it goes with this calf
    });
    return c;
  });

  const calvesSorted = _.sortBy(calves, c => c.group.date);

  return (
    <div className="history">
      <div className="historytitle">
        {recordfordate.date+': '+(recordfordate && recordfordate.tags ? recordfordate.tags.length : '0')} DEAD total.
      </div>
      {_.map(calvesSorted, (c,i) => {
        // group needs list of groups, tag, and an "as-of" date
        return <CalfCard key={'calfcard'+i} record={c} />
      })}
    </div>
  );
});

