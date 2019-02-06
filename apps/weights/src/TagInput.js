import React from 'react';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral';

import Keypad from './Keypad.js';
import Colorbar from './Colorbar.js';
import TagBar from './TagBar.js';

import './TagInput.css';

export default connect({
  recordsValid: state`recordsValid`,
      tagInput: state`tagInput`,
     changeTag: sequences`changeTag`,
       saveTag: sequences`saveTag`,
        moveUp: sequences`moveInputUp`,
      moveDown: sequences`moveInputDown`,
}, function TagInput(props) {

  const numberClicked = num => {
    const prefix = '' + (props.tagInput.tag.number || ''); // convert to string
    props.changeTag({tag: { number: prefix+num} });
  };

  const clearClicked = () => {
    props.changeTag({ tag: { number: '', color: '' } });
  };

  const backspaceClicked = () => {
    let str = ''+props.tagInput.tag.number;
    if (str.length > 0) str = str.slice(0,-1);
    props.changeTag({ tag: { number: +(str) } });
  };

  const canSave = props.recordsValid && props.tagInput.tag && props.tagInput.tag.number && props.tagInput.tag.color.length > 0;

  const tagSaveClicked = evt => {
    if (canSave) {
      evt.preventDefault();
      props.saveTag();
    }
  };

  return (
    <div className="taginput">

      <TagBar />

      <Colorbar />

      <Keypad onNumber={numberClicked}
              onClear={clearClicked}
              onBackspace={backspaceClicked}
              disableKeypress={true}/>

      <div className='taginputbuttonscontainer'>
        <div className='taginputrowbutton taginputrowbuttonleft'
             onClick={() => props.moveUp({ whichInput: 'tagInput' })}>
          ^
        </div>
        <div className={'savebutton ' + (canSave ? 'savebuttonenabled':'savebuttondisabled')}
           onClick={tagSaveClicked}>
          SAVE TAG
        </div>
        <div className='taginputrowbutton taginputrowbuttonright'
             onClick={() => props.moveDown({ whichInput: 'tagInput' })}>
          v
        </div>
      </div>

    </div>
  );
});
