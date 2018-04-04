import React from 'react';
import { connect } from '@cerebral/react';
import { signal } from 'cerebral/tags';

import './Prefs.css';

export default connect({
  logout: signal`logout`,
}, function Prefs(props) {

  const logoutClicked = evt => {
    props.logout();
    evt.preventDefault();
  }

  return (
    <div className="prefs">
      <a className="prefslink" onClick={logoutClicked}>Change Trello Account</a>
    </div>
  );
});

