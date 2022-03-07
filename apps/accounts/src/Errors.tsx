import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { context } from './state';
import { good, bad } from './styles';

const warn = debug('accounts#App:info');

export const Errors = observer(function App() {
  const ctx = React.useContext(context);
  const { state } = ctx;

  return (
    <div style={ state.errors.length < 1 ? good : bad }>
      { state.errors.length < 1 
        ? 'No errors currently' 
        : `There are ${state.errors.length} total errors.`
      }
      <br/>
      Made it to step: {state.stepResult?.step || 'none'}

    </div>
  )
});
