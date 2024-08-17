import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';

import { Keypad } from './Keypad.js';
import { Colorbar } from './Colorbar.js';
import { TagBar } from './TagBar.js';

import './TagInput.css';

let localnumber = 0;
export const TagInput = observer(function TagInput() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  localnumber = state.tagInput.tag.number;

  const numberClicked = (key: number) => {
    const prev = localnumber || state.tagInput.tag.number || 0;
    const number = prev*10 + key;// ? key : +(prev.toString() + key.toString());
    localnumber = number;
    actions.changeTag({ number });
  };

  const clearClicked = () => {
    actions.changeTag({ number: 0 });
  };

  const backspaceClicked = () => {
    let str = ''+state.tagInput.tag.number;
    if (str.length > 0) str = str.slice(0,-1);
    actions.changeTag({ number: +(str) });
  };

  const canSave = state.isInitialized && state.tagInput.tag && state.tagInput.tag.number && state.tagInput.tag.color;

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
             onClick={() => actions.moveTagInputUp()}>
          ^
        </div>
        <div className={'savebutton ' + (canSave ? 'savebuttonenabled':'savebuttondisabled')}
           onClick={() => actions.saveTag()}>
          SAVE TAG
        </div>
        <div className='taginputrowbutton taginputrowbuttonright'
             onClick={() => actions.moveTagInputDown()}>
          v
        </div>
      </div>

    </div>
  );
});