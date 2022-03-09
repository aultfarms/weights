import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import type { ledger } from '@aultfarms/accounts';
import { isMoment } from 'moment';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ReactJson from 'react-json-view';

const warn = debug('accounts#AcctViewer:warn');
const info = debug('accounts#AcctViewer:info');

export const AcctViewer = observer(function AcctViewer(
  { acct, vacct, centerline }: 
  { vacct?: ledger.ValidatedRawSheetAccount, acct?: ledger.Account, centerline?: number | null }
) {
  const a = acct || vacct;
  if (!a)  {
    warn('WARNING: you have to give either an Account or a ValidatedRawSheetAccount');
    return <React.Fragment />;
  }
  let { lines, origin, ...withoutLines } = a;

  const windowsize = 250;
  let focusonline: null | number = null;
  if (typeof centerline === 'number') {
   focusonline = centerline;
  } else {
   centerline = windowsize/2;
  }

  let start = centerline - (windowsize/2);
  if (start < 0) start = 0;
  const end = start + windowsize;
  info('will show lines from start = ', start, ' to end ', end);

  // Only show 1000 lines
  let showlines = lines;
  if (lines.length > windowsize) {
    warn('Ledger has > 1000 lines, only showing 1000 lines around line ',centerline);
    showlines = lines.slice(start, end);
  }

  // If we were asked to focus on a line, scroll there after render
  React.useEffect(() => {
    if (focusonline !== null) {
      const el = document.getElementById(`ledger-line-lineno${focusonline}`);
      if (!el) return;
      el.scrollIntoView();
    }
  }, [ focusonline, lines ]);

  const isasset = a.settings.accounttype !== 'cash' && a.settings.accounttype !== 'futures-cash';

  return (
    <Paper elevation={1}>
      <div>Showing lines {start+1} through { end < lines.length ? end : lines.length } of {lines.length}<br/></div>
      <div style={{
        display: 'flex', 
        flexDirection: 'row', 
        alignItems: 'stretch', 
        alignContent: 'center' 
      }} >
        <div>Account Info:</div>
        <ReactJson src={withoutLines} collapsed={1} displayDataTypes={false} />
        {/* todo: add origin info */}
      </div>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>date</TableCell>
              <TableCell align="right">description</TableCell>
              <TableCell align="right">who</TableCell>
              <TableCell align="right">category</TableCell>
              <TableCell align="right">amount</TableCell>
              <TableCell align="right">balance</TableCell>
              { !isasset ? '' : 
                <TableCell align="right">Asset Expectations</TableCell>
              }
              <TableCell>note</TableCell>
              <TableCell>everything</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {showlines.map((line, index) => (
              <TableRow
                key={`acctline-${index}`}
                id={`ledger-line-lineno${line.lineno}`}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell align="right">{line.lineno}</TableCell>
                <TableCell component="th" style={{ minWidth: '75px' }} scope="row">
                  {(line.date && isMoment(line.date)) 
                    ? line.date.format('YYYY-MM-DD')
                    : line.date
                  }
                </TableCell>
                <TableCell align="right">{line.description}</TableCell>
                <TableCell align="right">{line.who}</TableCell>
                <TableCell align="right">{line.category}</TableCell>
                <TableCell align="right">{line.amount}</TableCell>
                <TableCell align="right">{line.balance}</TableCell>
                { !isasset ? '' :
                  <TableCell align="right">
                    {'assetTxType' in line ? <div>{`Tx Type: ${line.assetTxType}`}</div> : '' }
                    {'expectedCurrentValue' in line ? <div>{`expectedCurrentValue: ${line.expectedCurrentValue}`}</div> : '' }
                    {'expectedPriorValue' in line ? <div>{`expectedPriorValue: ${line.expectedPriorValue}`}</div> : '' }
                    {'priorDate' in line ? <div>{`Prior Date: ${line.priorDate.format('YYYY-MM-DD')}`}</div> : '' }
                  </TableCell>
                }

                <TableCell>
                  { typeof line.note !== 'object'
                    ? line.note
                    : <ReactJson src={line.note || {}} displayDataTypes={false} name={null} collapsed={1} />
                  }
                </TableCell>
                <TableCell>
                  <ReactJson src={line} collapsed={true} displayDataTypes={false} name={null} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody> 
        </Table>
      </TableContainer>
    </Paper>
  )
});
