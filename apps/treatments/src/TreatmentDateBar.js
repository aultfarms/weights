import React from 'react';

import {connect} from '@cerebral/react';
import {state,sequences} from 'cerebral/tags';

import './TreatmentDateBar.css';

export default connect({
          record: state`record`,
  treatmentCodes: state`treatments.treatmentCodes`,
         changeRecord: sequences`changeRecord`,
  showTreatmentEditor: sequences`showTreatmentEditor`,
}, function TreatmentDateBar(props) {

  const dateChanged = evt => {
    evt.preventDefault();
    props.changeRecord({date: evt.target.value});
  };

  const treatmentTextClicked = evt => {
    evt.preventDefault();
    props.showTreatmentEditor();
  };

  return (
    <div className="treatmentdatebar">
      <input className='treatmentdateinput'
             value={props.record.date}
             type="date"
             onChange={dateChanged} />
      <input className='treatmentstring'
             value={props.record.treatment}
             type="text"
             onClick={treatmentTextClicked}
             onChange={treatmentTextClicked}/>
    </div>
  );
});
