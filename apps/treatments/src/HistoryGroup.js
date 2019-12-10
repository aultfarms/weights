import React from 'react';
import _ from 'lodash';
import numeral from 'numeral';
import moment from 'moment';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral/tags';

import {groupForTag} from 'aultfarms-lib/util/tagHelpers';

import './HistoryGroup.css';

export default connect({
  historySelector: state`historySelector`,
           groups: state`incoming.records`,
       treatments: state`treatments`,
             dead: state`dead`,
           record: state`record`,
           sortBy: state`historyGroup.sort`,
  sortBySignal: sequences`historyGroupSortClicked`,
}, function HistoryGroup(props) {
  let all_groups = props.groups;
  const group = groupForTag(props.groups, props.record.tag);
  if (group) all_groups = [ group ]; // just show group for current tag

  // For each group, compute Prob(dead), Prob(dead | 0 treatments), ...
  // "0 treatments" could mean either "received at least 0 treatments" or "received exactly  0"
  // I'm picking the "exactly" one for now
  _.each(all_groups, g => {
    const numdead = (g.dead ? g.dead.length : 0);
    // treatments.tagIndex looks like:
    // { <tagstr>: { <groupname>: { group: {...}, treatments: [ { treatment: "ExDr", date: "2019-08-07" } ] } }
    // and the resulting new indexByNumTreatments will look like:
    // [ 0: { dead: [ calves that died with 0 treatments }, alive: [ calves alive with 0 treatments ] }
    // [ 1: { dead: [ calves that died with 1 treatment  }, alive: [ calves alive with 1 treatment ] }
    // ....
    const indexByNumTreatments = _.reduce(_.keys(treatments.tagIndex), (acc,tagstr) => {
      const tagobj = treatments.tagIndex[tagstr];
      const calf = tagobj[g.groupname];
      if (!calf) return;
      const isdead = dead.tagIndex[tagstr] ? dead.tagIndex[tagstr][g.groupname] : false;
      const category = "pd"+tagobj.treatments.length; // pd0, pd1, pd2, ...
      const numtrt = tagobj.treatments.length;
      if (!acc[numtrt]) acc[numtrt] = { numdead: [], numalive: [] };
      
    }, []);
  });

  all_groups = _.sortBy(all_groups, g => {
    if (props.sortBy === 'date') return g.day; // day string is lexicographic for sorting
    if (props.sortBy === 'name') return g.groupname;
    if (props.sortBy === 'head') return g.head;
    if (props.sortBy === 'pd') return (g.dead ? g.dead.length : 0) / (g.head ? g.head : 1);
    return g.day; // default
  });
  all_groups = _.reverse(all_groups); // other way seems better
  return (
    <div className="historygroup">
      { group ? ' Showing group for current tag: '+props.record.tag.color+props.record.tag.number : '' }
      <table width="100%">
      <tbody>
        <tr>
          <th onClick={() => props.sortBySignal({ sort: 'name'})}>Name</th>
          <th onClick={() => props.sortBySignal({ sort: 'days'})}>Days</th>
          <th onClick={() => props.sortBySignal({ sort: 'head'})}>Head</th>
          <th onClick={() => props.sortBySignal({ sort: 'pd'})}>P(D)</th>
          <th onClick={() => props.sortBySignal({ sort: 'pd_0'})}>P(D|0T)</th>
          <th onClick={() => props.sortBySignal({ sort: 'pd_1'})}>P(D|1T)</th>
          <th onClick={() => props.sortBySignal({ sort: 'pd_2'})}>P(D|2T)</th>
          <th onClick={() => props.sortBySignal({ sort: 'pd_3'})}>P(D|3T)</th>
          <th onClick={() => props.sortBySignal({ sort: 'pd_4'})}>P(D|4T)</th>
          <th onClick={() => props.sortBySignal({ sort: 'pd_5'})}>P(D|5T)</th>
          <th onClick={() => props.sortBySignal({ sort: 'pd_6'})}>P(D|6+)</th>
        </tr>
      { 
        _.map(all_groups, (g,i) => {
          let perc = 0;
          if (g.dead && g.head) perc = g.dead.length / g.head;
          let name = g.groupname;
          if (name.length > 15) name = name.slice(0,6)+'...'+name.slice(-6);
          return (
            <tr className={ perc < .05 ? 'historygroupgood' : perc < 0.1 ? 'historygroupmeh' : 'historygroupbad' } key={'historygrouprow'+i}>
              <td className="historygroupname"><span name="historygroupnamepill">{ name }</span></td>
              <td className="historygroupdate"> { moment(g.date,'YYYY-MM-DD').format('M/DD/YY') }</td>
              <td className="historygroupdead">{ g.dead ? g.dead.length : 0 }</td>
              <td className="historygroupperc">{ perc > 0 ? '('+numeral(perc).format('0.00%')+')' : '' }</td>
            </tr>
          );
        })
      }
      </tbody>
      </table>
    </div>
  );
});

