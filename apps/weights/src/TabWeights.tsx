import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';
import numeral from 'numeral';

import './TabWeights.css';
import * as livestock from '@aultfarms/livestock';

function truncateGroupName(str: string) {
  const parts = str.split(':');
  if (parts[0].length > 6) {
    parts[0] = parts[0]!.slice(0,3)+'...'+parts[0].slice(-3);
  }
  return parts.join(':');
}

function truncateColor(str: string) {
  if (str.length < 8) return str;
  return str.slice(0,3)+'..'+str.slice(-3);
}

export const TabWeights = observer(function TabWeights() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  if (!state.isInitialized) return <React.Fragment/>;

  // have to reference rev to get redraw updates
  const tagcolors = state.records.rev ? actions.records().tagcolors : {};
  /*
  const extrarowtagactive = state.tagInput.row === state.weights.length;
  const extrarowweightactive = state.weightInput.row === state.weights.length;
  const extrarowcolor = tagcolors[state.tagInput.tag.color] || 'BLACK';
  */
  return (
    <div className="tabweights">
      <table className="tabweightstable">
        <thead>
          <tr>
            <th style={{width: "5%"}}>#</th>
            <th style={{width: "25%"}}>Tag</th>
            <th style={{width: "8%"}}>Weight</th>
            <th style={{width: "22%"}}>Group</th>
            <th style={{width: "8%"}}>Days</th>
            <th style={{width: "8%"}}>RoG</th>
            <th style={{width: "24%"}}>Sort</th>
          </tr>
        </thead>
        <tbody>
      { state.weights.map((r,i) => {
        const color = tagcolors[r.tag.color] || 'BLACK';
        const tagactive = state.tagInput.row === i;
        const weightactive = state.weightInput.row === i;
        const tag = tagactive ? state.tagInput.tag : r.tag;
        return <tr key={'tabweightstablerow'+i} className='tabweightstablerow'>
          <td className='tabweightstablecol' align="center">
            { (i+1) }
          </td>
          <td className={'tabweightstablecol ' + (tagactive ? 'tagactive ' : '')} 
              onClick={() => actions.moveTagInput(i)}
              id={tagactive ? 'tagScrollToMe' : 'tagDoNotScrollToMe' }>
            <div className="tabweightstagtext" style={{ color, borderColor: color }}>
              {truncateColor(tag.color)} {tag.number || ''}
            </div>
          </td>
          <td className={'tabweightstablecol ' + (weightactive ? 'weightactive' : '') }
              onClick={() => actions.moveWeightInput(i)}
              id={weightactive ? 'weightScrollToMe' : 'weightDoNotScrollToMe' }
              align="center">
            { weightactive ? state.weightInput.weight * 10 : r.weight }
          </td>
          <td className='tabweightstablecol' align="center">
            { truncateGroupName(r.group) || '' }
          </td>
          <td className='tabweightstablecol' align="center">
            { r.days || '' }
          </td>
          <td className='tabweightstablecol' align="center">
            { r.rog ? numeral(r.rog).format('0.00') : '' }
          </td>
          <td className='tabweightstablecol' align="center">
            <select 
              onChange={(evt) => actions.changeSort(i, evt.target.value)}
              value={ r.sort || 'SELL' }
            >
              {livestock.weights.sorts.map(s => <option key={'sortoption'+s} value={s}>{s}</option>)}
            </select>
          </td>

        </tr>})
      }
      {/*
      {
        <tr key="extrarow" className='tabweightstablerow'>
          <td className='tabweightstablecol' align="center">
            { (state.weights.length+1) }
          </td>
          <td className={'tabweightstablecol ' + (extrarowtagactive ? 'tagactive' : '') }
            onClick={() => actions.moveTagInput(state.weights.length)}
            id={extrarowtagactive ? 'tagScrollToMe' : 'tagDoNotScrollToMe' }>
            { extrarowtagactive ? 
                <div className="tabweightstagtext" style={{ color: extrarowcolor, borderColor: extrarowcolor }}>
                  {truncateColor(state.tagInput.tag.color) || '' } {state.tagInput.tag.number || ''}
                </div>
              : ' '
            }
          </td>
          <td className={'tabweightstablecol ' + (extrarowweightactive ? 'weightactive' : '') }
            onClick={() => actions.moveWeightInput(state.weights.length)}
            id={extrarowweightactive ? 'weightScrollToMe' : 'weightDoNotScrollToMe' }>
            { extrarowweightactive ? state.weightInput.weight * 10 : '' }
          </td>
          <td className={'tabweightstablecol'}>
          </td>
          <td className={'tabweightstablecol'}>
          </td>
          <td className={'tabweightstablecol'}>
          </td>
          <td className={'tabweightstablecol'}>
          </td>

        </tr>
      }
      */}
      </tbody>
      </table>
    </div>
  );
});

