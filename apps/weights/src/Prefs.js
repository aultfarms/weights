import React from 'react';
import { connect } from '@cerebral/react';
import { sequences } from 'cerebral';

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
      <a href="#top" className="prefslink" onClick={logoutClicked}>Change Trello Account</a>
    </div>
  );
});

