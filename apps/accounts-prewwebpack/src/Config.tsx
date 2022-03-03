import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state/index.js';

export const Config = observer(function Config() {
  const {state, actions} = React.useContext(context);


  return (
    <div>
      <div>
        I am the config for now.  state.config = { state.config }
      </div>
    </div>
  );

});
