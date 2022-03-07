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

const warn = debug('accounts#AcctViewer:info');

export const AcctViewer = observer(function AcctViewer({ acct, vacct }: { vacct?: ledger.ValidatedRawSheetAccount, acct?: ledger.Account }) {

  const a = acct || vacct;
  if (!a)  {
    warn('WARNING: you have to give either an Account or a ValidatedRawSheetAccount');
    return <React.Fragment />;
  }

  const { lines, origin, ...withoutLines } = a;

  const isasset = a.settings.accounttype !== 'cash' && a.settings.accounttype !== 'futures-cash';

  return (
    <Paper elevation={1}>
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
              <TableCell>date</TableCell>
              <TableCell align="right">description</TableCell>
              <TableCell align="right">who</TableCell>
              <TableCell align="right">category</TableCell>
              <TableCell align="right">amount</TableCell>
              <TableCell align="right">balance</TableCell>
              { !isasset ? '' : 
                <TableCell align="right">Asset Expectations</TableCell>
              }
              <TableCell align="right">note</TableCell>
              <TableCell align="right">everything</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line, index) => (
              <TableRow
                key={`acctline-${index}`}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
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

                <TableCell align="right">
                  { typeof line.note !== 'object'
                    ? line.note
                    : <ReactJson src={line.note || {}} collapsed={1} />
                  }
                </TableCell>
                <TableCell align="right"><ReactJson src={line} collapsed={true} displayDataTypes={false} /></TableCell>
              </TableRow>
            ))}
          </TableBody> 
        </Table>
      </TableContainer>
    </Paper>
  )
});
