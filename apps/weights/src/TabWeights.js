import React from 'react';
import _ from 'lodash';
import numeral from 'numeral';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral';

import './TabWeights.css';

function truncateGroupName(str) {
  const parts = _.split(str, ':');
  if (parts[0].length > 6) {
    parts[0] = parts[0].substr(0,3)+'...'+parts[0].substr(-3);
  }
  return _.join(parts, ':');
}

export default connect({
      records: state`weights.records`,
       colors: state`treatments.colors`,
     tagInput: state`tagInput`,
  weightInput: state`weightInput`,
    moveInput: sequences`moveInput`,
   changeSort: sequences`changeSort`,
}, class TabWeights extends React.Component {

  render() {
    const props = this.props;
    const extrarowtagactive = props.tagInput.row === props.records.length;
    const extrarowweightactive = props.weightInput.row === props.records.length;
    const extrarowcolor = (props.tagInput.tag && props.tagInput.tag.color) ? props.colors[props.tagInput.tag.color] : 'black';
    if (this.refTagActiveElement) this.refTagActiveElement.scrollIntoView();
    return (
      <div className="tabweights">
        <table className="tabweightstable">
          <thead>
            <tr>
              <th width="25%">Tag</th>
              <th width="10%">Weight</th>
              <th width="25%">Group</th>
              <th width="8%">Days</th>
              <th width="8%">RoG</th>
              <th width="24%">Sort</th>
            </tr>
          </thead>
          <tbody>
        { _.map(props.records, (r,i) => {
          const color = (r.tag && r.tag.color) ? props.colors[r.tag.color] : 'black';
          const tagactive = props.tagInput.row === i;
          const weightactive = props.weightInput.row === i;
          const tag = tagactive ? props.tagInput.tag : r.tag;
          return <tr key={'tabweightstablerow'+i} className='tabweightstablerow'>
            <td className={'tabweightstablecol ' + (tagactive ? 'tagactive ' : '')} 
                onClick={() => props.moveInput({ whichInput: 'tagInput', row: i })}
                id={tagactive ? 'tagScrollToMe' : 'tagDoNotScrollToMe' }>
              <div className="tabweightstagtext" style={{ color, borderColor: color }}>
                {(tag && tag.color) ? tag.color : '' } {(tag && tag.number) ? tag.number : ''}
              </div>
            </td>
            <td className={'tabweightstablecol ' + (weightactive ? 'weightactive' : '') }
                onClick={() => props.moveInput({ whichInput: 'weightInput', row: i })}
                id={weightactive ? 'weightScrollToMe' : 'weightDoNotScrollToMe' }
                align="center">
              { weightactive ? props.weightInput.weight * 10 : r.weight }
            </td>
            <td className='tabweightstablecol' align="center">
              { r.group ? truncateGroupName(r.group) : 'none' }
            </td>
            <td className='tabweightstablecol' align="center">
              {r.days ? r.days : '' }
            </td>
            <td className='tabweightstablecol' align="center">
              {r.rog ? numeral(r.rog).format('0.00') : '' }
            </td>
            <td className='tabweightstablecol' align="center">
              <select 
                onChange={(evt) => props.changeSort({ row: i, value: evt.target.value })}
                value={ r.sort || 'SELL' }
              >
                <option value='SELL'>SELL</option>
                <option value='HEAVY'>HEAVY</option>
                <option value='KEEP'>KEEP</option>
                <option value='JUNK'>JUNK</option>
                <option value='SPECIAL1'>SPECIAL1</option>
              </select>
            </td>
  
          </tr>})
        }
        {
          <tr key="extrarow" className='tabweightstablerow'>
            <td className={'tabweightstablecol ' + (extrarowtagactive ? 'tagactive' : '') }
              onClick={() => props.moveInput({ whichInput: 'tagInput', row: props.records.length })}
              id={extrarowtagactive ? 'tagScrollToMe' : false}>
              { extrarowtagactive ? 
                  <div className="tabweightstagtext" style={{ color: extrarowcolor, borderColor: extrarowcolor }}>
                    {(props.tagInput.tag && props.tagInput.tag.color) ? props.tagInput.tag.color : '' } {(props.tagInput.tag && props.tagInput.tag.number) ? props.tagInput.tag.number : ''}
                  </div>
                : ' '
              }
            </td>
            <td className={'tabweightstablecol ' + (extrarowweightactive ? 'weightactive' : '') }
              onClick={() => props.moveInput({ whichInput: 'weightInput', row: props.records.length })}
              id={extrarowweightactive ? 'weightScrollToMe' : false}>
              { extrarowweightactive ? props.weightInput.weight * 10 : '' }
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
        </tbody>
        </table>
      </div>
    );
  }
});

