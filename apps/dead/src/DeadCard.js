import React from 'react';
import {connect} from '@cerebral/react';
import _ from 'lodash';

import './DeadCard.css';

export default connect({
}, function DeadCard(props) { 
  if (!props.record || !props.record.tags) return '';
  return (
    <div className="deadcard">
      <div className="deadcardcount">{props.record.tags ? props.record.tags.length : '0'} head</div>
      -
      <div className="deadcardtags">
       {_.map(props.record.tags, (t,i) => 
          <div className="deadcardtag" key={'deadcardtag'+i}>
            {t.color+t.number}
          </div>
        )}
      </div>
    </div>
  );
});

