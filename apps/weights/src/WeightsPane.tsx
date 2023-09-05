import * as React from 'react';
import { observer } from 'mobx-react-lite';
//import debug from 'debug';
import { context } from './state';

import { Msg } from './Msg';
import { TabContainer } from './TabContainer';
import { TabSelector } from './TabSelector';
import { WeightDateBar } from './WeightDateBar';

import './WeightsPane.css';

export const WeightsPane = observer(function WeightsPane() {
  const ctx = React.useContext(context);
  const { state } = ctx;

  return (
    <div className='weightspane' style={{ height: state.window.orientation === 'landscape' ? '100vh' : '100vw' }}>
      <Msg />
      <TabSelector />
      <WeightDateBar />
      <TabContainer />
    </div>
   );
});
