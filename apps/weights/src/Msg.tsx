import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';

import './Msg.css';

export const Msg = observer(function Msg() {
  const ctx = React.useContext(context);
  const { state } = ctx;

  const m = state.msgs[state.msgs.length-1] || { text: '' };
  if (!m.type) m.type = 'good';

  return (
    <div className={'msg msg' + m.type}>
      {m.text}
    </div>
   );
});
