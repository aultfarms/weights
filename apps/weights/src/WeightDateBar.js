import React from 'react';
import _ from 'lodash';
import numeral from 'numeral';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral';

import './WeightDateBar.css';

export default connect({
          date: state`date`,
       records: state`weights.records`,
        limits:  state`limits`,
          changeDate: sequences`changeDate`,
  loadWeightsForDate: sequences`loadWeightsForDate`,
    changeLightLimit: sequences`changeLightLimit`,
    changeHeavyLimit: sequences`changeHeavyLimit`,
}, function WeightDateBar(props) {

  const dateChanged = evt => {
    evt.preventDefault();
    props.changeDate({date: evt.target.value});
  };

  const totalhead = props.records.length;
  const lighthead = _.filter(props.records, r => r.weight && r.weight < props.limits.light).length;
  const heavyhead = _.filter(props.records, r => r.weight && r.weight > props.limits.heavy).length;
  const avestats = _.reduce(props.records, (acc,r) => { 
    acc.lbsGain += r.lbsGain || 0; 
    acc.days += r.days || 0; 
    acc.adjWeight += r.adjWeight || 0; 
    acc.outs += r.out ? 1 : 0;
    acc.outs2 += r.out2 ? 1 : 0;
    acc.outs3 += r.out3 ? 1 : 0;
    if (r.adjWeight) acc.count++;  
    return acc; 
  },{lbsGain: 0, days: 0, adjWeight: 0, count: 0, outs: 0, outs2: 0, outs3: 0});
  const averog = avestats.days ? avestats.lbsGain / avestats.days : 0;
  const avewt = avestats.count ? avestats.adjWeight / avestats.count : 0;
  const totalouts = avestats.outs;

  return (
    <div className="weightdatebar">
      <input className='weightdatebarinput'
             value={props.date}
             type="date"
             onChange={dateChanged}
             onBlur={() => props.loadWeightsForDate()}/>
      <div className='weightdatebarfilter'>
        { totalhead + ' total' }
      </div>
      <div className='weightdatebarfilter'>
        { lighthead } &lt; 
        <input className='weightdatebarinput' 
             label='Light'  size='5'
             value={props.limits.light} onChange={evt => { evt.preventDefault(); props.changeLightLimit({ light: evt.target.value})} } />
        lbs
      </div>
      <div className='weightdatebarfilter'>
        { heavyhead } &gt;
        <input className='weightdatebarinput' 
             label='Heavy' 
             size='5'
             value={props.limits.heavy} onChange={evt => { evt.preventDefault(); props.changeHeavyLimit({ heavy: evt.target.value})} } />
        lbs
      </div>
      <div className='weightdatebarfilter'>
        { numeral(averog).format('0.00') } RoG
      </div>
      <div className='weightdatebarfilter'>
        { numeral(avewt).format('0') } lbs
      </div>
      <div className='weightdatebarfilter'>
        ({ totalouts ? totalouts : '0' },{ avestats.outs2 ? avestats.outs2 : '0' },{ avestats.outs3 ? avestats.outs3 : '0' }) out
      </div>


      <div className="spacer"></div>
       
    </div>
  );
});
