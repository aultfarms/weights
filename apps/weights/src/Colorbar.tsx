import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';

import './Colorbar.css';

export const Colorbar = observer(function Colorbar() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  if (!state.isInitialized) return <React.Fragment/>;

  const colors = state.records.rev ? actions.records().tagcolors : {};

  function displayColorButton(c: string) {
    return (
      <div key={'color'+c} 
        className="colorbutton"
        onClick={() => actions.changeTag({ color: c })}
        style={{backgroundColor: colors[c] }}>
      </div>
    );
  }

  return (
    <div className="colorbar">
      {Object.keys(colors).map(displayColorButton)}
      <div key={'colorNOTAG'}
        className="colorbutton"
        onClick={() => actions.changeTag({ color: 'NOTAG'})}
        style={{backgroundColor: '#CCCCCC'}}>
      </div>
    </div>
  );
});

