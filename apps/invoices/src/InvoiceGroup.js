import React from 'react';
import _ from 'lodash';
import { connect } from '@cerebral/react';
import { Compute, state } from 'cerebral';

import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';

const groupData = Compute(
  state`invoicegroups.curgroup`,
  (curgroup,get) => get(state`feed.${curgroup}`),
);

export default connect({
  curgroup: state`invoicegroups.curgroup`,
  groupData, // computed value for current group
}, function InvoiceGroup(props) {
  return (
    <div className="invoice-group">
      <Typography variant="h1" gutterBottom>
        {props.curgroup}
      </Typography>

      { _.map(_.keys(props.groupData), name => 
          <Card>
            <CardContent>
              <Typography gutterBottom>
                {name}
              </Typography>
            </CardContent>
          </Card>
        )
      }
    </div> 
  );
});
