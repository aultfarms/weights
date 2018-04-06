import React from 'react';

import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';

import Msg from './Msg';
import TabContainer from './TabContainer';
import TabSelector from './TabSelector';
import WeightDateBar from './WeightDateBar';

import './WeightsPane.css';

export default connect({
  windowSize: state`windowSize`,
}, function WeightsPane(props) {
  return (
    <div className='weightspane' style={{ height: props.windowSize.orientation === 'landscape' ? '100vh' : '100vw' }}>
      <Msg />
      <TabSelector />
      <WeightDateBar />
      <TabContainer />
    </div>
   );
});
