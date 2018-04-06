import React from 'react';
import _ from 'lodash';
import numeral from 'numeral';
import moment from 'moment';

import {connect} from '@cerebral/react';
import {state,signal} from 'cerebral/tags';

import './TabGroup.css';

export default connect({
     groups: state`incoming.records`,
 treatments: state`treatments.records`,
     sortBy: state`historyGroup.sort`,
 sortBySignal: signal`tabGroupSortClicked`,
}, function TabGroup(props) {
  let all_groups = props.groups;
  all_groups = _.sortBy(all_groups, g => {
    if (props.sortBy === 'date') return g.day; // day string is lexicographic for sorting
    if (props.sortBy === 'name') return g.groupname;
    if (props.sortBy === 'dead') return g.dead;
    if (props.sortBy === 'perc') return (g.dead ? g.dead.length : 0) / (g.head ? g.head : 1);
    return g.day; // default
  });
  all_groups = _.reverse(all_groups); // other way seems better
  return (
    <div className="tabgroup">
      <table width="100%">
      <tbody>
        <tr>
          <th onClick={() => props.sortBySignal({ sort: 'name'})}>Name</th>
          <th onClick={() => props.sortBySignal({ sort: 'date'})}>Date</th>
          <th onClick={() => props.sortBySignal({ sort: 'dead'})}>Dead</th>
          <th onClick={() => props.sortBySignal({ sort: 'perc'})}>%</th>
        </tr>
      { 
        _.map(all_groups, (g,i) => {
          let perc = 0;
          if (g.dead && g.head) perc = g.dead.length / g.head;
          let name = g.groupname;
          if (name.length > 15) name = name.slice(0,6)+'...'+name.slice(-6);
          return (
            <tr className={ perc < .05 ? 'tabgroupgood' : perc < 0.1 ? 'tabgroupmeh' : 'tabgroupbad' } key={'tabgrouprow'+i}>
              <td className="tabgroupname"><span name="tabgroupnamepill">{ name }</span></td>
              <td className="tabgroupdate"> { moment(g.date,'YYYY-MM-DD').format('M/DD/YY') }</td>
              <td className="tabgroupdead">{ g.dead ? g.dead.length : 0 }</td>
              <td className="tabgroupperc">{ perc > 0 ? '('+numeral(perc).format('0.00%')+')' : '' }</td>
            </tr>
          );
        })
      }
      </tbody>
      </table>
    </div>
  );
});

