import React from 'react';
import _ from 'lodash';
import { connect } from '@cerebral/react';
import { state } from 'cerebral';

import './CardErrors.css';

import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';

export default connect({
  errors: state`feed.errors`,
}, function CardErrors(props) {
  if (!props.errors || props.errors.length < 1) return <div></div>;
  return (
    <div className="card-errors">
      {_.map(props.errors, (e,i) => 
        <Card key={'card-errors-e'+i}>
          <CardContent>
            Error on card:<br/>
            {e.error}<hr/>
            <pre>{JSON.stringify(e.card, false, '  ')}</pre>
          </CardContent>
        </Card>
      )}
    </div> 
  );
});
