import React from 'react';
import _ from 'lodash';
import numeral from 'numeral';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral';

import Card from '@material-ui/core/Card';

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

  const heavyhead = _.filter(props.records, r => r.weight && r.weight > props.limits.heavy).length;
  const stats = _.reduce(props.records, (acc,r) => { 
    if (!r.sort || !r.adjWeight || !r.tag) { console.log('invalid record, r = ', r); return acc; }

    const which = acc[r.sort]; // SELL, KEEP, HEAVY, JUNK
    which.lbsGain += r.lbsGain || 0; 
    which.days += r.days || 0; 
    which.adjWeight += r.adjWeight;
    which.count++;
    const all = acc.ALL;
    all.lbsGain += r.lbsGain || 0; 
    all.days += r.days || 0; 
    all.adjWeight += r.adjWeight;
    all.count++;

    return acc; 
  }, {
         ALL: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
        SELL: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
       HEAVY: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
        KEEP: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
        JUNK: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
    SPECIAL1: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
  });

  function renderStatsObj(name, obj) {
    return <Card key={'weightdatebarstats'+name} className="weightdatebarcardouter">
      <div className="weightdatebarcardtitle">
        { name }
      </div>
      <div className="weightdatebarcardinner">
        <div className='weightdatebarfilter'>
          { obj.count + ' head' }
        </div>
        <div className='weightdatebarfilter'>
          { obj.days ? numeral(obj.lbsGain / obj.days).format('0.00') : 0 } RoG
        </div>
        <div className='weightdatebarfilter'>
          { obj.count ? numeral(obj.adjWeight / obj.count).format('0') : 0 } lbs
        </div>
      </div>
    </Card>

  }

  function renderStats(which) {
    return renderStatsObj(which, stats[which]);
  }

  function renderCombinedStats(arr) {
    const obj = _.cloneDeep(stats[arr[0]]);
    _.each(arr.slice(1), which => {
      const s = stats[which];
      obj.count += s.count;
      obj.lbsGain += s.lbsGain;
      obj.adjWeight += s.adjWeight;
    });
    return renderStatsObj(_.join(arr, '+'), obj);
  }
  
  return (
    <div className="weightdatebar">
      <Card className="weightdatebarcardouter">
        <div className="weightdatebarcardtitle">
          Date / Heavy Filter
        </div>
        <div className="weightdatebarcardinner">
          <input className='weightdatebarinput'
                   value={props.date}
                   type="date"
                   onChange={dateChanged}
                   onBlur={() => props.loadWeightsForDate()}/>
          <div className='weightdatebarfilter'>
            { heavyhead } &gt;
              <input className='weightdatebarinput' 
                 label='Heavy' 
                 size='5'
                 value={props.limits.heavy} onChange={evt => { evt.preventDefault(); props.changeHeavyLimit({ heavy: evt.target.value})} } />
            lbs
          </div>
        </div>
      </Card>
      { _.map(['ALL', 'SELL', 'HEAVY', 'KEEP', 'JUNK' ], renderStats) }
      { renderCombinedStats(['SELL', 'HEAVY']) }

    </div>
  );
});
