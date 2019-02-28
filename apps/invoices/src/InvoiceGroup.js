import React from 'react';
import _ from 'lodash';
import { connect } from '@cerebral/react';
import { state,sequences} from 'cerebral';
import numeral from 'numeral';
import moment from 'moment';

import './InvoiceGroup.css';

import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Table from '@material-ui/core/Table';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import TableRow from '@material-ui/core/TableRow';
import TableCell from '@material-ui/core/TableCell';
import Button from '@material-ui/core/Button';


export default connect({
  curgroupname: state`invoicegroups.curgroupname`,
  curgroup: state`invoicegroups.curgroup`, // computed value for current group
  markAsInvoiced: sequences`feed.markAsInvoiced`,
}, function InvoiceGroup(props) {

  return (
    <div className="invoice-group">
      <Typography variant="h2" gutterBottom>
        {props.curgroupname}
      </Typography>

      { _.map(_.keys(props.curgroup), (name,i) => 
          <Card className="invoice-group-row" key={'invoice-group-card-'+i}>
            <CardContent>
              <Typography gutterBottom>
                {name}
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Where</TableCell>
                    <TableCell>Weight (tons)</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {_.map(_.sortBy(props.curgroup[name], r => moment(r.date).format('YYYY-MM-DD')), (r,i) =>
                    <TableRow key={'invoicegroup-row-'+i}>
                      <TableCell>{r.date.format('YYYY-MM-DD')}</TableCell>
                      <TableCell>{r.source}</TableCell>
                      <TableCell>{numeral(r.weight / 2000.0).format('0,0.00')}</TableCell>
                      <TableCell><Button onClick={() => { props.markAsInvoiced({card: r.card}) }}>Mark Invoiced</Button></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      }
    </div> 
  );
});
