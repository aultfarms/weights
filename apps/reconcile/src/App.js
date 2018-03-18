import React from 'react';
import { connect } from '@cerebral/react';
import { state } from 'cerebral/tags';
import './App.css';

import ChecksPaste from './ChecksPaste';
import AccountSheet from './AccountSheet';

export default connect({
}, function App(props) {
  return (
    <div className="App">
      <AccountSheet />
      <ChecksPaste />
    </div>
  );
});

