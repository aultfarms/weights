import React from 'react';
import {connect} from '@cerebral/react';
import {state,signal} from 'cerebral/tags';

import Msg from './Msg';

import './App.css';

export default connect({
  recordsValid: state`recordsValid`,
          dead: state`dead`,
      incoming: state`incoming`,
    treatments: state`treatments`,
  init: signal`init`,
}, class App extends React.Component {

  componentWillMount() {
    this.props.init();
  }

  renderJSON() {
    const {dead,incoming,treatments} = this.props;
    if (!this.props.recordsValid) return 'Awating valid records...';
    return (
      <div>
        <pre style={{userSelect: 'all'}}>
          {JSON.stringify({dead,incoming,treatments},false,'  ')}
        </pre>
      </div>
    );
  }

  render() {
    return (
      <div>
        { !this.recordsValid ? <Msg /> : '' }
        { this.renderJSON() }
      </div>
    );
  }

});
