import React from 'react';
import {connect} from '@cerebral/react';
import _ from 'lodash';

import './TreatmentCard.css';

export default connect({
}, function TreatmentCard(props) { return (
  <div className="treatmentcard">
    <div className="treatmentcardcount">{props.record.tags.length} head</div>
    -
    <div className="treatmentcardtreatment">{props.record.treatment}</div>
    <div className="treatmentcardtags">
     {_.map(props.record.tags, (t,i) => 
        <div className="treatmentcardtag" key={'treatmentcardtag'+i}>
          {t.color+t.number}
        </div>
      )}
    </div>
  </div>
)});

