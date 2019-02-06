import React from 'react';
import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral';

import './TagBar.css';

export default connect({
     tag: state`tagInput.tag`,
  colors: state`treatments.colors`,
  changeTag: sequences`changeTag`,
}, function TagBar(props) {
  const colorTextChanged = evt => {
    evt.preventDefault();
    props.changeTag({tag: { color: evt.target.value} });
  };

  const tagNumberTextChanged = evt => {
    evt.preventDefault();
    props.changeTag({tag: { number: +(evt.target.value)} });
  };

  const color = props.colors[props.tag.color];
  return (
    <div className="tagbar">
      <input className="colortext"
             style={{ color: color, borderColor: color }}
             value={props.tag.color}
             type="text"
             onChange={colorTextChanged} />
      <input className="numbertext"
             value={props.tag.number || ''} 
             type="text" 
             onChange={tagNumberTextChanged} />
    </div>
  );

});

