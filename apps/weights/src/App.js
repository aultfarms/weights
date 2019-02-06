import React from 'react';
import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral';

import WeightsPane from './WeightsPane';
import TagInput from './TagInput';
import WeightInput from './WeightInput';

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
    const inputdir = dir === 'row' ? 'column' : 'row'; // arrange input opposite main layout
    const maxinputwidth = inputdir === 'row' ? '100%' : '250px';

    return (
      <div className="App" style={{ flexDirection: dir }}>
        <WeightsPane />
        <div className="inputs" style={{ flexDirection: inputdir, maxWidth: maxinputwidth }}>
          <TagInput />
          <div className="spacer"></div>
          <WeightInput />
        </div>
      </div>
    );
  }

});
