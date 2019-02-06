import React from 'react';
import numeral from 'numeral';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral';

import Keypad from './Keypad.js';

import './WeightInput.css';

export default connect({
  recordsValid: state`recordsValid`,
   weightInput: state`weightInput`,
  changeWeight: sequences`changeWeight`,
    saveWeight: sequences`saveWeight`,
        moveUp: sequences`moveInputUp`,
      moveDown: sequences`moveInputDown`,
}, function WeightInput(props) {

  const numberClicked = num => {
    const prefix = '' + (props.weightInput.weight || ''); // convert to string
    props.changeWeight({weight: prefix+num});
  };

  const clearClicked = () => {
    props.changeWeight({ weight: '' });
  };

  const backspaceClicked = () => {
    let str = ''+props.weightInput.weight;
    if (str.length > 0) str = str.slice(0,-1);
    props.changeWeight({ weight: +(str) });
  };

  const canSave = props.recordsValid && props.weightInput.weight > 0;

  const weightSaveClicked = evt => {
    if (canSave) {
      evt.preventDefault();
      props.saveWeight();
    }
  };


  return (
    <div className="weightinput">
      <div className="weightinputdisplay">
        <input className="weightinputdisplayinput"
          size="8"
          disabled='disabled'
          value={numeral(props.weightInput.weight*10).format(0,0) } />
        lbs 
      </div>

      <Keypad onNumber={numberClicked}
              onClear={clearClicked}
              onBackspace={backspaceClicked}
              disableKeypress={true}/>

      <div className='weightinputbuttonscontainer'>
        <div className='weightinputrowbutton weightinputrowbuttonleft'
             onClick={() => props.moveUp({ whichInput: 'weightInput' })}>
          ^
        </div>
        <div className={'weightsavebutton ' + (canSave ? 'weightsavebuttonenabled':'weightsavebuttondisabled')}
             onClick={weightSaveClicked}>
          SAVE LBS
        </div>
        <div className='weightinputrowbutton weightinputrowbuttonright'
             onClick={() => props.moveDown({ whichInput: 'weightInput' })}>
          v
        </div>
      </div>

    </div>
  );
});
