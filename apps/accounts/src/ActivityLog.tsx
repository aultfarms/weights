import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';

export const ActivityLog = observer(() => {
  const { state, actions } = React.useContext(context);
  return (
    <div>
      {state.activityLog.map((l,i) => <div key={`activitylog-key${i}`}>{l}</div>)}
    </div>
  )
});
