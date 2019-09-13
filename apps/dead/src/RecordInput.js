import React from 'react';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral/tags';

import {tagHelpers} from 'aultfarms-lib/util';

import Keypad from './Keypad.js';
import Colorbar from './Colorbar.js';
import DateBar from './DateBar.js';

import './RecordInput.css';

export default connect({
          record: state`record`,
          colors: state`colors`,
  treatmentCodes: state`treatments.treatmentCodes`,
    recordsValid: state`recordsValid`,
    deadTagIndex: state`dead.tagIndex`,
       changeRecord: sequences`changeRecord`,
         saveRecord: sequences`saveRecord`,
}, function RecordInput(props) {
  const record = props.record;

  const numberClicked = num => {
    const prefix = '' + (props.record.tag.number || ''); // convert to string
    props.changeRecord({tag: { number: prefix+num} });
  };

  const clearClicked = () => {
    props.changeRecord({ tag: { number: '', color: '' } });
  };

  const backspaceClicked = () => {
    let str = ''+props.record.tag.number;
    if (str.length > 0) str = str.slice(0,-1);
    props.changeRecord({ tag: { number: +(str) } });
  };

  const tagstr = tagHelpers.tagObjToStr(props.record.tag);
  const alreadydead = record.group && props.deadTagIndex && props.deadTagIndex[tagstr] && props.deadTagIndex[tagstr][record.group.groupname];
  const canSave = () => (props.recordsValid && props.record.tag && props.record.tag.number && props.record.tag.color && !alreadydead);
  const recordSaveClicked = evt => {
    if (canSave()) {
      evt.preventDefault();
      props.saveRecord();
    }
  };

  return (
    <div className="recordinput">

      <Colorbar />

      <DateBar />

      <Keypad onNumber={numberClicked}
              onClear={clearClicked}
              onBackspace={backspaceClicked} />

      <div className={'savebutton ' + (canSave() ? 'savebuttonenabled':'savebuttondisabled')}
           onClick={recordSaveClicked}>
        SAVE DEAD 
      </div>

    </div>
  );
});
