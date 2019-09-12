import React from 'react';
import { connect } from '@cerebral/react';
import { sequences } from 'cerebral/tags';

import './Prefs.css';

export default connect({
  logout: sequences`logout`,
}, function Prefs(props) {

  const logoutClicked = evt => {
    props.logout();
    evt.preventDefault();
  }

  return (
    <div className="prefs">
      <p className="prefslink" href="#" onClick={logoutClicked}>Change Trello Account</p>
    </div>
  );
});

