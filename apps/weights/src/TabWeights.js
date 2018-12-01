import React from 'react';
import _ from 'lodash';
import numeral from 'numeral';

import {connect} from '@cerebral/react';
import {state,signal} from 'cerebral/tags';

import './TabWeights.css';

export default connect({
      records: state`weights.records`,
       colors: state`treatments.colors`,
     tagInput: state`tagInput`,
  weightInput: state`weightInput`,
    moveInput: signal`moveInput`,
    changeOut: signal`changeOut`,
   changeOut2: signal`changeOut2`,
   changeOut3: signal`changeOut3`,
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
              <th width="8%">O</th>
              <th width="8%">O2</th>
              <th width="8%">O3</th>
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
                id={tagactive ? 'tagScrollToMe' : false}>
              <div className="tabweightstagtext" style={{ color, borderColor: color }}>
                {(tag && tag.color) ? tag.color : '' } {(tag && tag.number) ? tag.number : ''}
              </div>
            </td>
            <td className={'tabweightstablecol ' + (weightactive ? 'weightactive' : '') }
                onClick={() => props.moveInput({ whichInput: 'weightInput', row: i })}
                id={weightactive ? 'weightScrollToMe' : false}>
              { weightactive ? props.weightInput.weight * 10 : r.weight }
            </td>
            <td className='tabweightstablecol'>
              { r.group ? r.group : 'none' }
            </td>
            <td className='tabweightstablecol'>
              {r.days ? r.days : '' }
            </td>
            <td className='tabweightstablecol'>
              {r.rog ? numeral(r.rog).format('0.00') : '' }
            </td>
            <td className='tabweightstablecol'>
              <input type='checkbox' checked={!!r.out} onClick={(evt) => props.changeOut({row: i, checked: evt.target.checked})} />
            </td>
            <td className='tabweightstablecol'>
              <input type='checkbox' checked={!!r.out2} onClick={(evt) => props.changeOut2({row: i, checked: evt.target.checked})} />
            </td>
            <td className='tabweightstablecol'>
              <input type='checkbox' checked={!!r.out3} onClick={(evt) => props.changeOut3({row: i, checked: evt.target.checked})} />
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

