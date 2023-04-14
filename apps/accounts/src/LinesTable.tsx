import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { ledger, } from '@aultfarms/accounts';
import moment from 'moment';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ReactJson from 'react-json-view';
import numeral from 'numeral';

const warn = debug('accounts#InventoryMissingViewer:warn');
const info = debug('accounts#InventoryMissingViewer:info');

function fmtMoney(n: number | undefined) {
  if (!n && n !== 0) return '';
  if (Math.abs(n) < 0.01) n = 0;
  const str = numeral(n).format('$0,0.00');
  if (n < 0) {
    return <span style={{color: 'red'}}>{str}</span>
  }
  return str;
}
function fmtInt(n: number | undefined) {
  if (!n && n !== 0) return '';
  if (Math.abs(n) < 0.01) n = 0;
  const str = numeral(n).format('0,0');
  if (n < 0) { return <span style={{color: 'red'}}>{str}</span> }
  return str;
}
function fmtFloat(n: number | undefined, decimals: number = 2) {
  if (!n && n !== 0) return '';
  if (Math.abs(n) < 0.01) n = 0;
  let decimals_str = '';
  for (let i=0; i < decimals; i++) {
    decimals_str += '0';
  }
  const str = numeral(n).format(`0,0.${decimals_str}`);
  if (n < 0) {
    return <span style={{color: 'red'}}>{str}</span>
  }
  return str;
}


export const LinesTable = observer(function LinesTable(
  { lines, qtyPrecision }:
  { lines: ledger.AccountTx[] | ledger.InventoryAccountTx[] | ledger.LivestockInventoryAccountTx[], qtyPrecision?: number }
) {
  if (lines.length < 1) return <React.Fragment/>;
  const hasQty = 'qty' in lines[0]!;
  const hasQtyBalance = 'qtyBalance' in lines[0]!;
  const hasWeight = 'weight' in lines[0]!;
  const hasWeightBalance = 'weightBalance' in lines[0]!;
  const hasTaxAmount = 'taxAmount' in lines[0]!;
  const hasTaxBalance = 'taxBalance' in lines[0]!;

  if (lines.length < 1) return <React.Fragment/>;

  function fmtQty(n: number | undefined) {
    if (!qtyPrecision) return fmtInt(n);
    return fmtFloat(qtyPrecision);
  }

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 700 }}>
      <Table stickyHeader sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>date</TableCell>
            <TableCell align="right">description</TableCell>
            <TableCell align="right">category</TableCell>
            <TableCell align="right">amount</TableCell>
            <TableCell align="right">balance</TableCell>
            { hasQty           ? <TableCell align="right">qty</TableCell>           : <React.Fragment /> }
            { hasQtyBalance    ? <TableCell align="right">qtyBalance</TableCell>    : <React.Fragment /> }
            { hasWeight        ? <TableCell align="right">weight</TableCell>        : <React.Fragment /> }
            { hasWeightBalance ? <TableCell align="right">weightBalance</TableCell> : <React.Fragment /> }
            { hasTaxAmount     ? <TableCell align="right">taxAmount</TableCell>     : <React.Fragment /> }
            { hasTaxBalance    ? <TableCell align="right">taxBalance</TableCell>    : <React.Fragment /> }
            <TableCell>note</TableCell>
            <TableCell>everything</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          { lines.map((line, index) => (
            <TableRow
              key={`linestablerow-${index}`}
              id={`ledger-line-lineno${line.lineno}`}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell align="right">{line.lineno}</TableCell>
              <TableCell component="th" style={{ minWidth: '75px' }} scope="row">
                {(line.date && moment.isMoment(line.date)) 
                  ? line.date.format('YYYY-MM-DD')
                  : line.date
                }
              </TableCell>
              <TableCell align="right">{line.description}</TableCell>
              <TableCell align="right">{line.category}</TableCell>
              <TableCell align="right">{fmtMoney(line.amount)}</TableCell>
              <TableCell align="right">{fmtMoney(line.balance)}</TableCell>
              { hasQty           ? <TableCell align="right">{fmtQty(line.qty)}</TableCell>           : <React.Fragment /> }
              { hasQtyBalance    ? <TableCell align="right">{fmtQty(line.qtyBalance)}</TableCell>    : <React.Fragment /> }
              { hasWeight        ? <TableCell align="right">{fmtFloat(line.weight)}</TableCell>        : <React.Fragment /> }
              { hasWeightBalance ? <TableCell align="right">{fmtFloat(line.weightBalance)}</TableCell> : <React.Fragment /> }
              { hasTaxAmount     ? <TableCell align="right">{fmtMoney(line.taxAmount)}</TableCell>     : <React.Fragment /> }
              { hasTaxBalance    ? <TableCell align="right">{fmtMoney(line.taxBalance)}</TableCell>    : <React.Fragment /> }
              <TableCell>
                { typeof line.note !== 'object'
                  ? line.note
                  : <ReactJson src={line.note || {}} displayDataTypes={false} name={null} collapsed={1}  enableClipboard={false} />
                }
              </TableCell>
              <TableCell>
                <ReactJson src={line} collapsed={true} displayDataTypes={false} name={null} enableClipboard={false} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody> 
      </Table>
    </TableContainer>
  );
});
