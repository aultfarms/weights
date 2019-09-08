import React from 'react';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral/tags';

import './DateBar.css';

export default connect({
  record: state`record`,
  changeRecord: sequences`changeRecord`,
}, function DateBar(props) {

  const dateChanged = evt => {
    evt.preventDefault();
    props.changeRecord({date: evt.target.value});
  };

   return (
    <div className="datebar">
      <input className='dateinput'
             value={props.record.date}
             type="date"
             onChange={dateChanged} />
    </div>
  );
});
