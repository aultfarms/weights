import * as React from 'react';
import { observer } from 'mobx-react-lite';
//import { context } from './state';

import './Prefs.css';

export const Prefs = observer(function Prefs() {
  /* TODO:
  const ctx = React.useContext(context);
  const { state, actions } = ctx;


  const logoutClicked = evt => {
    actions.logout();
    evt.preventDefault();
  }

  return (
    <div className="prefs">
      <a href="#top" className="prefslink" onClick={logoutClicked}>Change Trello Account</a>
    </div>
  );
  */
  return <React.Fragment/>;
});

