import React from 'react';
import _ from 'lodash';
import numeral from 'numeral';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral';

import Card from '@material-ui/core/Card';

import './WeightDateBar.css';

export default connect({
          date: state`date`,
         stats: state`weights.stats`,
       filters: state`weights.filters`,
          changeDate: sequences`changeDate`,
  loadWeightsForDate: sequences`loadWeightsForDate`,
    changeHeavyLimit: sequences`weights.changeHeavyLimit`,
}, function WeightDateBar(props) {

  const heavyFilter = props.filters && props.filters.heavy ? props.filters.heavy : { limit: 1500, count: 0 };

  const dateChanged = evt => {
    evt.preventDefault();
    props.changeDate({date: evt.target.value});
  };

  function renderStatsObj(name, obj) {
    return <Card key={'weightdatebarstats'+name} className="weightdatebarcard">
      <div className="weightdatebarcardtitle">
        { name }
      </div>
      <div className='weightdatebarfilter'>
        { obj.count + ' head' }
      </div>
      <div className='weightdatebarfilter'>
        { obj.days ? numeral(obj.lbsGain / obj.days).format('0.00') : 0 } RoG
      </div>
      <div className='weightdatebarfilter'>
        { obj.count ? numeral(obj.adjWeight / obj.count).format('0') : 0 } lbs
      </div>
    </Card>
  }

  function renderStats(which) {
    if (!props.stats || !props.stats[which]) return '';
    return renderStatsObj(which, props.stats[which]);
  }

  function renderCombinedStats(displayName, arr) {
    if (!props.stats || !props.stats[arr[0]]) return;
    const obj = _.cloneDeep(props.stats[arr[0]]);
    _.each(arr.slice(1), which => {
      const s = props.stats[which];
      if (!s) return;
      obj.count += s.count;
      obj.lbsGain += s.lbsGain;
      obj.adjWeight += s.adjWeight;
    });
    return renderStatsObj(displayName, obj);
  }
  
  return (
    <div className="weightdatebar">
    
      <div className="weightdatebarleft">
        <Card className="weightdatebarinputcard">
          <input className='weightdatebarinput'
                   value={props.date}
                   type="date"
                   onChange={dateChanged}
                   onBlur={() => props.loadWeightsForDate()}
          />
          <div className='weightdatebarfilter'>
            { heavyFilter.count } &gt;
            <input className='weightdatebarinput' 
               label='Heavy' 
               size='5'
               value={heavyFilter.limit} 
               onChange={evt => { props.changeHeavyLimit({ limit: evt.target.value}) } } 
            />
            lbs
          </div>
        </Card>
      </div>
      <div className="weightdatebarright">
        { _.map(['ALL', 'SELL', 'HEAVY' ], renderStats) }
      </div>
      <div className="weightdatebarright">
        { _.map(['KEEP', 'JUNK' ], renderStats) }
        { renderCombinedStats('S+H', ['SELL', 'HEAVY']) }
      </div>

    </div>
  );
});
