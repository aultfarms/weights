import * as React from 'react';

import './Keypad.css';

export function Keypad({ 
  onBackspace,
  onNumber,
  onClear,
  disableKeypress,
} : {
  onBackspace: () => any,
  onClear: () => any,
  onNumber: (num: number) => any,
  disableKeypress?: boolean,
}) {
  function handleKeydown(evt: KeyboardEvent) {
    if (disableKeypress) return; 
    if (evt.code === 'Backspace') {
      onBackspace(); // backspace
      evt.preventDefault();
    }
    // Code: 'Digit1', Key: '1'
    if (evt.code.match(/^Digit[0-9]/)) {
      onNumber(+(evt.key));
    }
  }
  React.useEffect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  return (
    <div className="keypad">
      <div className="keypadrow"> 
        <div className="keypadbutton" key="calcwrap1" onClick={() => onNumber(1)}>1</div>
        <div className="keypadbutton" key="calcwrap2" onClick={() => onNumber(2)}>2</div>
        <div className="keypadbutton" key="calcwrap3" onClick={() => onNumber(3)}>3</div>
      </div>

      <div className="keypadrow"> 
        <div className="keypadbutton" key="calcwrap4" onClick={() => onNumber(4)}>4</div>
        <div className="keypadbutton" key="calcwrap5" onClick={() => onNumber(5)}>5</div>
        <div className="keypadbutton" key="calcwrap6" onClick={() => onNumber(6)}>6</div>
      </div>

      <div className="keypadrow"> 
        <div className="keypadbutton" key="calcwrap7" onClick={() => onNumber(7)}>7</div>
        <div className="keypadbutton" key="calcwrap8" onClick={() => onNumber(8)}>8</div>
        <div className="keypadbutton" key="calcwrap9" onClick={() => onNumber(9)}>9</div>
      </div>

      <div className="keypadrow"> 
        <div className="keypadbutton" key="calcwrapC" onClick={onClear}>C</div>
        <div className="keypadbutton" key="calcwrap0" onClick={() => onNumber(0)}>0</div>
        <div className="keypadbutton" key="calcwrapB" onClick={onBackspace}>{"<--"}</div>
      </div>
    </div>
  );
};
