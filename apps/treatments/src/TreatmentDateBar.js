import React from 'react';
import _ from 'lodash';

import {connect} from '@cerebral/react';
import {state,signal} from 'cerebral/tags';

import './TreatmentDateBar.css';

export default connect({
          record: state`record`,
  treatmentCodes: state`treatments.treatmentCodes`,
         changeRecord: signal`changeRecord`,
  showTreatmentEditor: signal`showTreatmentEditor`,
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
