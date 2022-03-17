import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { context } from './state';
import { good, bad } from './styles';

const warn = debug('accounts#App:info');

export const Errors = observer(function App() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  const sr = actions.stepResult();

  return (
    <div style={ { ...(state.errors.length < 1 ? good : bad), padding: '10px' } }>
      { state.errors.length < 1 
        ? 'No errors currently' 
        : `There are ${state.errors.length} total errors.`
      }
      <br/>
      { (sr && state.stepResult.rev > 0)
        ?  `Made it to step: ${sr.step}`
        : ''
      }

    </div>
  )
});
