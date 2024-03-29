import * as React from 'react';
import { observer } from 'mobx-react-lite';
//import debug from 'debug';
import { context } from './state';
import numeral from 'numeral';
import * as livestock from '@aultfarms/livestock';

import Card from '@mui/material/Card';

import './WeightDateBar.css';


export const WeightDateBar = observer(function WeightDateBar() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  function renderStatsObj(name: string, stats: livestock.WeightStat) {
    return <tr key={'weightdatebarstats'+name}>
      <td align="right">{ name }</td>
      <td align="right">{ stats.count }</td>
      <td align="right">
        { stats.days ? numeral(stats.lbsGain / stats.days).format('0.00') : 0 }
      </td>
      <td align="right">
        { stats.count ? numeral(stats.lbsGain / stats.count).format('0') : 0 }
      </td>
      <td align="right">
        {stats.count ? numeral(stats.days / stats.count).format('0') : 0 }
      </td>
    </tr>
  }

  // For S+H:
  function renderCombinedStats(displayName: string, arr: string[]) {
    const obj: livestock.WeightStat = { count: 0, lbsGain: 0, days: 0, adj_wt: 0 };
    for (const a of arr) {
      const s = state.stats[a];
      if (!s) continue;
      obj.count += s.count;
      obj.lbsGain += s.lbsGain;
      obj.adj_wt += s.adj_wt;
      obj.days += s.days;
    }
    return renderStatsObj(displayName, obj);
  }

  // Need this wrapper so combined can use the same display function
  function renderStatsFromState(name: string) {
    const stats = state.stats[name];
    if (!stats) return <React.Fragment key={'weightdatebarfrag'+name}/>; // this is dumb I have to put a key on a react fragment
    return renderStatsObj(name, stats);
  }
  function renderGroupStatsFromState(name: string) {
    const stats = state.groupstats[name];
    if (!stats) return <React.Fragment key={'weightdatebarfrag'+name}/>; // this is dumb I have to put a key on a react fragment
    return renderStatsObj(name, stats);
  }
  
  return (
    <div className="weightdatebar">
      <div className="weightdatebarleft">
        <Card className="weightdatebarinputcard">
          <input className='weightdatebarinput'
                   value={state.date}
                   type="date"
                   onChange={evt => actions.changeDate(evt.target.value)}
                   onBlur={() => actions.loadWeights()}
          />
          <div className='weightdatebarfilter'>
            { state.limits.heavy.count } &gt;
            <input className='weightdatebarinput' 
               size={5}
               value={state.limits.heavy.limit} 
               onChange={evt => actions.changeHeavyLimit(+(evt.target.value)) } 
            />
            lbs
          </div>
        </Card>
      </div>
      <table>
        <tr>
          <th>Sort</th>
          <th>#</th>
          <th>RoG</th>
          <th>Lbs</th>
          <th>Days</th>
         </tr>
         { renderCombinedStats('ALL', livestock.weights.sorts) }
         { livestock.weights.sorts.map(renderStatsFromState) }
         { renderCombinedStats('S+H', ['SELL', 'HEAVY']) }
      </table>
      <table className="weightdatebarstatstable">
       <tr>
         <th>Group</th>
         <th>#</th>
         <th>RoG</th>
         <th>Lbs</th>
         <th>Days</th>
        </tr>
        { Object.keys(state.groupstats).sort().map(renderGroupStatsFromState) }
      </table>

    </div>
  );
});
