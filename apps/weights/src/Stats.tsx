import * as React from 'react';
import { observer } from 'mobx-react-lite';
//import debug from 'debug';
import { context } from './state';
import numeral from 'numeral';
import * as livestock from '@aultfarms/livestock';

import Card from '@mui/material/Card';

import './Stats.css';


function maxlength(s: string): string {
  if (s.length < 15) {
    return s;
  }
  const first = s.slice(0,6);
  const last = s.slice(-6);
  return first+'..'+last;
}

export const Stats = observer(function Stats() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  function renderStatsObj(name: string, stats: livestock.WeightStat) {
    return <tr key={'statsstats'+name}>
      <td align="right">{ name }</td>
      <td align="right">{ (stats.count + stats.notags) }</td>
      <td align="right">
        { stats.days ? numeral(stats.lbsGain / stats.days).format('0.00') : 0 }
      </td>
      <td align="right">
        { stats.count ? numeral(stats.adj_wt / (stats.count + stats.notags)).format('0') : 0 }
      </td>
      <td align="right">
        {stats.count ? numeral(stats.days / stats.count).format('0') : 0 }
      </td>
    </tr>
  }

  // For S+H:
  function renderCombinedStats(displayName: string, arr: string[]) {
    const obj: livestock.WeightStat = { count: 0, lbsGain: 0, days: 0, adj_wt: 0, notags: 0 };
    for (const a of arr) {
      //@ts-ignore
      const s = state.stats.today.sorts[a];
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
    const stats = state.stats.today.sorts[name];
    if (!stats) return <React.Fragment key={'statsfrag'+name}/>; // this is dumb I have to put a key on a react fragment
    return renderStatsObj(name, stats);
  }

// XXX STOPPED HERE XXX:
// - limits can just iterate over state.stats.today.ranges
// - we need to add an ability to sort/search by tag number, and/or filter to a type of sort if we are looking for particular cows
// - Maybe add 1 more table of stats for the "all", or just split the group table into groups today and then the rest of the groups after?
  return (
    <div className="stats">
      <table>
        <thead>
          <tr><th># &gt; lbs</th></tr>
        </thead>
        <tbody>
          { Object.entries(state.stats.today.ranges).map(([lbs, stat]) => 
            <tr key={'rangesrow'+lbs}>
              <td align="right">{stat.count + stat.notags} &gt; {lbs}</td>
            </tr>
          ).reverse()}
        </tbody>
      </table>

      <table>
        <thead>
          <tr>
            <th>Sort</th>
            <th>#</th>
            <th>RoG</th>
            <th>Lbs</th>
            <th>Days</th>
          </tr>
        </thead>
        <tbody>
          { renderCombinedStats('ALL', livestock.weights.sorts) }
          { livestock.weights.sorts.map(renderStatsFromState) }
          { renderCombinedStats('S+H', ['SELL', 'HEAVY']) }
        </tbody>
      </table>
      <table className="statsstatstable">
        <thead>
          <tr>
            <th>Group</th>
            <th>#</th>
            <th>RoG</th>
            <th>Lbs</th>
            <th>Days</th>
           </tr>
        </thead>
        <tbody>
          <tr><td colSpan={5} align="center">-------------- Today -----------------</td></tr>
          { Object.entries(state.stats.today.incoming).map(([name, s]) => renderStatsObj(maxlength(name), s)) }
          <tr><td colSpan={5} align="center">----------- Past Year ----------------</td></tr>
          { Object.entries(state.stats.pastyear.incoming).map(([name, s]) => renderStatsObj(maxlength(name), s)) }
        </tbody>
      </table>
{/*
      <table className="statsstatstable">
        <thead>
          <tr>
            <th>Group</th>
            <th>#</th>
            <th>RoG</th>
            <th>Lbs</th>
            <th>Days</th>
           </tr>
        </thead>
        <tbody>
          <tr><td colSpan={5} align="center">-------------- All -----------------</td></tr>
          { Object.entries(state.stats.all.incoming).map(([name, s]) => renderStatsObj(maxlength(name), s)) }
        </tbody>
      </table>
*/}

    </div>
  );
});
