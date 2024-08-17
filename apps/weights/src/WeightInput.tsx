import * as React from 'react';
import { observer } from 'mobx-react-lite';
//import debug from 'debug';
import { context } from './state';
import numeral from 'numeral';
import { Keypad } from './Keypad.js';

import './WeightInput.css';

export const WeightInput = observer(function WeightInput() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  const canSave = state.isInitialized && state.weightInput.weight > 0;

  const backspaceClicked = () => {
    let str = ''+state.weightInput.weight;
    if (str.length > 0) str = str.slice(0,-2); // take off the zero plus the last digit
    actions.changeWeight(+(str + '0')); // add the zero back in
  };

  const numberClicked = (key: number) => {
    const prev = state.weightInput.weight || 0;
    const number = 10*(prev + key);//  +(prev.toString().slice(0,-1) + key.toString() + '0');
    actions.changeWeight(number);
  };


  return (
    <div className="weightinput">
      <div className="weightinputdisplay">
        <input className="weightinputdisplayinput"
          size={8}
          disabled={true}
          value={numeral(state.weightInput.weight).format('0,0') } />
        lbs
      </div>

      <Keypad
        onNumber={numberClicked}
        onClear={() => actions.changeWeight(0)}
        onBackspace={backspaceClicked}
        disableKeypress={true}
      />

      <div className="weightinputbuttonscontainer">
        <div className="weightinputrowbutton weightinputrowbuttonleft"
          onClick={actions.moveWeightInputUp}
        >
          ^
        </div>
        <div className={'weightsavebutton ' + (canSave ? 'weightsavebuttonenabled':'weightsavebuttondisabled')}
          onClick={() => { if (canSave) actions.saveWeight(); }}
        >
          SAVE LBS
        </div>
        <div className='weightinputrowbutton weightinputrowbuttonright'
          onClick={actions.moveWeightInputDown}
        >
          v
        </div>
      </div>

    </div>
  );
});