import React from 'react';
import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral/tags';

import TagPane from './TagPane';
import RecordInput from './RecordInput';

import './App.css';

export default connect({
  windowSize: state`windowSize`,
  init: sequences`init`,
}, class App extends React.Component {

  componentWillMount() {
    this.props.init();
  }

  render() {
    const dir = this.props.windowSize.orientation === 'landscape' ? 'row' : 'column';

    return (
      <div className="App" style={{ flexDirection: dir }}>
        <TagPane />
        <RecordInput />
      </div>
    );
  }

});
