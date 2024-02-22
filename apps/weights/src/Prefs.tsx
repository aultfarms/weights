import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';

import './Prefs.css';

export const Prefs = observer(function Prefs() {
  const ctx = React.useContext(context);
  const { actions } = ctx;

  return (
    <div className="prefs">
      <button onClick={actions.cleanOldSheets}>Start Cleaning Old Spreadsheets</button>
    </div>
  );
});

