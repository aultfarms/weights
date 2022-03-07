import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';
import { good, bad } from './styles';
import { escape } from 'html-escaper';
import ErrorIcon from '@mui/icons-material/Error';
import CheckIcon from '@mui/icons-material/Check';
import { Errors } from './Errors';

import ansispan from 'ansispan';
import htmlparse from 'html-react-parser';

function preprocessMessage(msg: string): React.ReactElement{
  // get rid of any special html chars
  msg = escape(msg);
  // add <pre> if it has newlines
  if (msg.indexOf('\n') > -1) {
    msg = `<span style="white-space: pre-wrap;">${msg}</span>`;
  }
  return <div>{htmlparse(ansispan(msg))}</div>;
}

export const ActivityLog = observer(() => {
  const { state, actions } = React.useContext(context);

  const showAccount = (acctname: string) => () => {
    actions.selectedAccountName(acctname);
    actions.page('ledger');
  };

  const viewAccountForMessage = (msg: string) => {
    const parts = msg.match(/^ACCOUNT ([^:]+):/);
    if (!parts?.[1]) return '';
    return <a href="#" onClick={showAccount(parts[1])}>View Ledger</a>;
  }

  return (
    <div>
      <Errors />
      <hr />
      <div id="activitylog">
        {state.activityLog.slice().reverse().map((l,i) => 
          <div 
            key={`activitylog-key${i}`} 
            style={{
              padding: '5px',
              borderBottom: '1px solid grey',
              display: 'flex',
              flexDirection: 'row', 
              alignItems: 'stretch',
              alignContent: 'center'
            }}
          >
            <div 
              style={{ 
                ...(l.type === 'good' ? {} : { backgroundColor: '#FFDDDD' }),
                display: 'flex',
                flexDirection: 'column',
              }} 
            >
              <div style={{ flexGrow: 1 }}></div>
              <div style={{ flexGrow: 0 }}>
                { l.type === 'good' 
                  ? <CheckIcon style={good} /> 
                  : <ErrorIcon style={bad} /> 
                }
              </div>
              <div style={{ flexGrow: 1 }}></div>
            </div>
            <div>
              {preprocessMessage(l.msg)}
              {viewAccountForMessage(l.msg)}
            </div>
          </div>)
        }
      </div>
    </div>
  )
});
