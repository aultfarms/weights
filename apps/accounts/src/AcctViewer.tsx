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
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import Button from '@mui/material/Button';
import ReactJson from 'react-json-view';
import numeral from 'numeral';

const warn = debug('accounts#AcctViewer:warn');
const info = debug('accounts#AcctViewer:info');

function num(n: number | undefined) {
  if (!n && n !== 0) return '';
  const str = numeral(n).format('$0,0.00');
  if (n < 0) {
    return <span style={{color: 'red'}}>{str}</span>
  }
  return str;
}

export const AcctViewer = observer(function AcctViewer(
  { acct, vacct, centerline, categoryFilter }: 
  { vacct?: ledger.ValidatedRawSheetAccount, acct?: ledger.Account, centerline?: number | null, categoryFilter: string | 'All' }
) {
  const [startLine, setStartLine] = React.useState(0);

  const a = acct || vacct;
  if (!a)  {
    warn('WARNING: you have to give either an Account or a ValidatedRawSheetAccount');
    return <React.Fragment />;
  }
  let { lines, origin, ...withoutLines } = a;

  let filterlines = (lines as ledger.ValidatedRawTx[]);
  if (categoryFilter && categoryFilter !== 'All') {
    filterlines = filterlines.filter(l => l.category?.match(categoryFilter));
  }

  const windowsize = 250;
  let focusonline: null | number = null;
  if (typeof centerline === 'number') {
    focusonline = centerline;
  } else {
    centerline = windowsize/2 + startLine
  }

  let start = centerline - (windowsize/2);
  if (start < 0) start = 0;
  const end = start + windowsize;
  info('will show lines from start = ', start, ' to end ', end);

  // Only show 1000 lines
  let showlines = filterlines;
  if (filterlines.length > windowsize) {
    warn('Ledger has > 1000 lines, only showing 1000 lines around line ',centerline);
    showlines = filterlines.slice(start, end);
  }

  // If we were asked to focus on a line, scroll there after render
  React.useEffect(() => {
    if (focusonline !== null) {
      const el = document.getElementById(`ledger-line-lineno${focusonline}`);
      if (!el) return;
      el.scrollIntoView();
    }
  }, [ focusonline, filterlines ]);

  const isasset = a.settings.accounttype !== 'cash' && a.settings.accounttype !== 'futures-cash';
  
  const handleMove = (dirname: 'left' | 'right') => () => {
    const dir = dirname === 'left' ? -1 : 1;
    setStartLine(startLine + (dir * windowsize));
  };

  return (
    <Paper elevation={1}>
      <div>
        Showing lines {start+1}
        &nbsp;through { end < filterlines.length ? end : filterlines.length } 
        &nbsp;of {filterlines.length}
        {start > 0 
          ? <Button onClick={handleMove('left')} size="small">
             <KeyboardArrowLeftIcon onClick={handleMove('left')} />
           </Button>
          : <React.Fragment/>
        }
        {end < filterlines.length
          ? <Button onClick={handleMove('right')} size="small">
             <KeyboardArrowRightIcon onClick={handleMove('right')} />
           </Button>
          : <React.Fragment/>
        }
        <br/>
      </div>
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
      <TableContainer component={Paper} sx={{ maxHeight: 700 }}>
        <Table stickyHeader sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              { a.name === 'All' ? <TableCell>account</TableCell> : <React.Fragment/> }
              <TableCell>date</TableCell>
              <TableCell align="right">description</TableCell>
              <TableCell align="right">who</TableCell>
              <TableCell align="right">category</TableCell>
              <TableCell align="right">amount</TableCell>
              <TableCell align="right">balance</TableCell>
              { !isasset ? <React.Fragment/> : 
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
                { a.name === 'All' ? <TableCell>{line.acct.name}</TableCell> : <React.Fragment/> }
                <TableCell component="th" style={{ minWidth: '75px' }} scope="row">
                  {(line.date && isMoment(line.date)) 
                    ? line.date.format('YYYY-MM-DD')
                    : line.date
                  }
                </TableCell>
                <TableCell align="right">{line.description}</TableCell>
                <TableCell align="right">{line.who}</TableCell>
                <TableCell align="right">{line.category}</TableCell>
                <TableCell align="right">{num(line.amount)}</TableCell>
                <TableCell align="right">{num(line.balance)}</TableCell>
                { !isasset ? '' :
                  <TableCell align="right">
                    {'assetTxType' in line ? <div>{`Tx Type: ${line.assetTxType}`}</div> : '' }
                    {'expectedCurrentValue' in line ? <div>expectedCurrentValue: {num(line.expectedCurrentValue)}</div> : '' }
                    {'expectedPriorValue' in line ? <div>expectedPriorValue: {num(line.expectedPriorValue)}</div> : '' }
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
