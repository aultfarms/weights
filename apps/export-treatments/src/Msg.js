import React from  'react';
import {connect} from '@cerebral/react';
import {state} from 'cerebral/tags';

import './Msg.css';

export default connect({
  msg: state`msg`,
}, function Msg(props) {
  return (
    <div className={'msg msg' + props.msg.type}>
      {props.msg.text}
    </div>
   );
});
