import React from 'react';
import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';
import numeral from 'numeral';
import moment from 'moment';

import './CalfCard.css';

// GREEN946: 
//   7 treatments, here 109 days.
// Group: BKTKY:MAY19-1: 
//   12 (29%) dead 
//   29% 1+ treatments,
//   12% 2+ treatments
//    9% 3+ treatments,
export default connect({
  colors: state`treatments.colors`,
}, function CalfCard(props) { 
  const r = props.record;
  /*
  r = {
    tag: { color: "BLUE", number: 193 },
    treatments: [
      { date: "2019-07-22", treatment: "ExDrHt" },
      { date: "2019-08-22", treatment: "PByHt" },
    ],
    group: {
      name: 'BKTKY:MAY19-1',
      date: '2019-09-11',
      head: 260,
      dead: [
        { date: '2019-08-17', tag: { color: 'BLUE', number: 7 } },
      ],
    },
  };
  */

  let color='black';
  if (r.tag && r.tag.color && props.colors[r.tag.color]) {
    color = props.colors[r.tag.color];
  }
  const dayshere = moment().diff(moment(r.group.date), 'days');
  const percdead = (r.group.dead ? r.group.dead.length : 0) / (+r.group.head) * 100.0;

  let groupclass = 'calfcardgoodgroup';
  if (percdead >= 10.0) groupclass = 'calfcardmoderategroup';
  if (percdead >= 20.0) groupclass = 'calfcardbadgroup';
  return (
    <div className="calfcard">
      <div className="calfcardheader">
        <span className="calfcardcolortext" style={{fontWeight:'bold', color }}>{r.tag.color}{r.tag.number}:&nbsp;</span>
        {r.treatments ? r.treatments.length : '0'} treatments,&nbsp;
        {dayshere} day{dayshere > 1 || dayshere < 1 ? 's' : ''} onsite.
      </div>

      <div className={"calfcardgroupinfo "+groupclass}>
        {r.group.groupname}: &nbsp;
        {r.group.dead ? r.group.dead.length : '0'} head 
        ({numeral(percdead).format('0.00')}%) dead
      </div>

    </div>
  );
});

