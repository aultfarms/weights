import React from 'react';
import _ from 'lodash';
import { connect } from '@cerebral/react';
import { state } from 'cerebral';

import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';

export default connect({
  curgroupname: state`invoicegroups.curgroupname`,
  curgroup: state`invoicegroups.curgroup`, // computed value for current group
}, function InvoiceGroup(props) {
  return (
    <div className="invoice-group">
      <Typography variant="h1" gutterBottom>
        {props.curgroupname}
      </Typography>

      { _.map(_.keys(props.curgroup), name => 
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
