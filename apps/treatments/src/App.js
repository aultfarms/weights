import React from 'react';
import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral/tags';

import TagPane from './TagPane';
import RecordInput from './RecordInput';
import TreatmentEditor from './TreatmentEditor';

import './App.css';

export default connect({
  treatmentEditorActive: state`treatmentEditorActive`,
             windowSize: state`windowSize`,
                 trello: state`trello`,
        historySelector: state`historySelector`,
  init: sequences`init`,
}, class App extends React.Component {

  componentDidMount() {
    this.props.init();
  }

  render() {
    const dir = this.props.windowSize.orientation === 'landscape' ? 'row' : 'column';
    const active = this.props.historySelector.active;

    if (this.props.treatmentEditorActive) {
      return (
        <div className="App" style={{ flexDirection: 'column' }} >
          <TreatmentEditor />
        </div>
      );
    }
    return (
      <div className="App" style={{ flexDirection: dir }}>
        <TagPane />
        {active === 'group' || active === 'time' ? '' : 
          <RecordInput />
        }
      </div>
    );
  }

});
