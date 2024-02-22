import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';

import './Errors.css';

export const Errors = observer(function Errors() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  // Have to reference rev to get redraws
  const records = state.records.rev ? actions.records() : null;
  function displayErrors(type: 'incoming' | 'dead' | 'treatments') {
    if (!records) return <div>No records</div>;
    if (records[type].errors.length < 1) return <div>No {type} errors</div>
    return (
      <div>
        <h3>{type} Card Errors:</h3>
        {
          records[type].errors.map((e,i) => 
            <div key={'incomingrecorderror'+i}>
              <pre>{JSON.stringify(e,null,'  ')}</pre>
            </div>
          )
        }
      </div>
    );
  }
  return (
    <div className="errors" style={{ display: 'flex', flexDirection: 'column' }}>
      <hr />
      {displayErrors('incoming')}
      <hr />
      {displayErrors('dead')}
      <hr />
      {displayErrors('treatments')}
      <hr />
      <div>
        <h3>Messages</h3>
        {state.msgs.map((m,i) => 
          <div key={'errormsgs'+i}
            style={{ color: m.type === 'bad' ? 'red' : 'green' }}
          >
            {m.text}
          </div>)
        }
      </div>
    </div>
  );
});

