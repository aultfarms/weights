import * as React from 'react';
import { observer } from 'mobx-react-lite';
import { context } from './state';

import './TagBar.css';

export const TagBar = observer(function TagBar() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  // Need to reference record rev to get redraw updates
  let tagcolors = state.records.rev ? actions.records().tagcolors : {};
  const color = tagcolors[state.tagInput.tag.color] || 'BLACK';
  return (
    <div className="tagbar">
      <input className="colortext"
             style={{ color: color, borderColor: color }}
             value={state.tagInput.tag.color}
             type="text"
             readOnly={true} />
      <input className="numbertext"
             value={state.tagInput.tag.number || ''} 
             type="text"
             readOnly={true} />
    </div>
  );

});

