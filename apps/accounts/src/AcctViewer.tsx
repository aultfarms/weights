import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { ledger, balance, google } from '@aultfarms/accounts';
import moment, { Moment } from 'moment';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Button from '@mui/material/Button';
import ReactJson from 'react-json-view';
import numeral from 'numeral';
import xlsx from 'xlsx-js-style';
import { context } from './state';

const warn = debug('accounts#AcctViewer:warn');
const info = debug('accounts#AcctViewer:info');

function num(n: number | undefined) {
  if (!n && n !== 0) return '';
  if (Math.abs(n) < 0.01) n = 0;
  const str = numeral(n).format('$0,0.00');
  if (n < 0) {
    return <span style={{color: 'red'}}>{str}</span>
  }
  return str;
}

export const AcctViewer = observer(function AcctViewer(
  { acct, vacct, accts, centerline, categoryFilter, categoryExact, year }: 
  { vacct?: ledger.ValidatedRawSheetAccount, acct?: ledger.Account, accts?: ledger.Account[] | null, centerline?: number | null, categoryFilter: string | 'All', categoryExact: boolean, year: string | number }
) {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  const [startLine, setStartLine] = React.useState(0);

  const a = acct || vacct;
  if (!a)  {
    warn('WARNING: you have to give either an Account or a ValidatedRawSheetAccount');
    return <React.Fragment />;
  }
  let { lines, origin, ...withoutLines } = a;

  let filterlines = (lines as ledger.ValidatedRawTx[]);
  if (categoryFilter && categoryFilter !== 'All') {
    if (categoryExact) {
      filterlines = filterlines.filter(l => l.category === categoryFilter);
    } else {
      filterlines = filterlines.filter(l => l.category?.match(categoryFilter));
    }
  }
  if (year) {
    year = +(year);
    filterlines = filterlines.filter(l => {
      if (!l.date) return false;
      if (typeof l.date === 'string') {
        const parts = l.date.split('-');
        const y = parts[0]; // YYYY-MM-DD
        if (y === (''+year)) return true;
        return false;
      }
      return l.date.year() === +(year);
    });
  }
  // Keep track of all the running balances in this subset of transactions:
  let running_balance_total = 0;
  const filterbalances = filterlines.map(l => (running_balance_total += (l.amount || 0)));


  const windowsize = 250;
  let focusonline: null | number = null;
  if (typeof centerline === 'number') {
    focusonline = centerline;
  } else {
    centerline = windowsize/2 + startLine
  }

  let numpages = Math.ceil(filterlines.length / windowsize);
  if (numpages < 0) numpages = 0;
  let start = centerline - (windowsize/2);
  if (start < 0) start = 0;
  const end = start + windowsize;
  info('will show lines from start = ', start, ' to end ', end);
  const pagenum = start / windowsize + 1;

  // Only show 1000 lines
  let showlines = filterlines;
  let showbalances = filterbalances;
  if (filterlines.length > windowsize) {
    warn('Ledger has > '+windowsize+' lines, only showing around line ',centerline);
    showlines = filterlines.slice(start, end);
    showbalances = filterbalances.slice(start,end);
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
    let pagemove = pagenum;
    if (pagemoveRef) pagemove = +(pagemoveRef.current?.value || 1);
    let newstart = 0;
    if (pagenum === pagemove) { // if the textbox has the current page number as the "move to", then just move one page at a time
      const dir = dirname === 'left' ? -1 : 1;
      newstart = startLine + (dir * windowsize);
    } else { // otherwise, we have a specified page, move directly there
      newstart = (pagemove-1) * windowsize;
    }
    setStartLine(newstart);
    // Update the value in the textbox to the new page.  Can't control it directly because
    // that re-renders on every keystroke, so we use an uncontrolled input
    if (pagemoveRef && pagemoveRef.current) {
      pagemoveRef.current.value = ''+(newstart / windowsize + 1);
    }
  };

  const handleUploadDownload = (direction: 'up' | 'down') => async () => {
    const wb = ledger.accountToWorkbook({
     ...a,
     lines: filterlines
    });
    console.log('workbook = ', wb);
    const now = moment();
    const filename = `${now.format('YYYY-MM-DD')}_Account_${a?.name || ''}.xlsx`;
    const fullpath = `${state.config.saveLocation.path}/${filename}`;
    if (direction === 'up') {
      actions.activity(`Uploading file to Google at ${fullpath}...`);
      await google.uploadXlsxWorkbookToGoogle({ 
        parentpath: state.config.saveLocation.path,
        filename,
        workbook: wb,
      });
      actions.activity(`Upload successful to path ${fullpath}...`);
      actions.balanceMsg(`Upload successful to path ${fullpath}...`);
    } else {
      actions.activity(`Downloading ${filename}`);
      xlsx.writeFile(wb, filename, { bookType: 'xlsx' });
      actions.activity(`${filename} downloaded successfully`);
    }
  };

  const balanceForDate = (d: string | Moment | null | undefined) => {
    if (!accts || !d) {
      console.log('ERROR: balanceForDate: have no accts (', accts, ')  OR have no date (',d,')!');
      return 0;
    }
    if (typeof d === 'string') {
      d = moment(d, 'YYYY-MM-DD');
    }
    let total = 0;
    for (const a of accts) {
      total += balance.balanceForAccountOnDate(d, a);
    }
    return total;
  };

  let pagemoveRef = React.useRef<HTMLInputElement>(null);
  return (
    <Paper elevation={1}>
      <div>
        Showing lines {start+1}
        &nbsp;through { end < filterlines.length ? end : filterlines.length } 
        &nbsp;of {filterlines.length}
        &nbsp;(Page {pagenum} of {numpages})
        <Button disabled={start < 1} onClick={handleMove('left')} size="small">
          <KeyboardArrowLeftIcon />
        </Button>
        <TextField inputRef={pagemoveRef} size="small" margin="none" sx={{ width: '2ch' }} variant="standard" defaultValue={pagenum} />
        <Button disabled={end >= filterlines.length} onClick={handleMove('right')} size="small">
          <KeyboardArrowRightIcon />
        </Button>
        <Button disabled={!a} onClick={handleUploadDownload('down')} size="small">
          <DownloadIcon />
        </Button>
        <Button disabled={!a} onClick={handleUploadDownload('up')} size="small">
          <CloudUploadIcon />
        </Button>
        <br/>
      </div>
      <div style={{
        display: 'flex', 
        flexDirection: 'row', 
        alignItems: 'stretch', 
        alignContent: 'center' 
      }} >
        <div>Account Info:</div>
        <ReactJson src={withoutLines} collapsed={1} displayDataTypes={false} name={null} enableClipboard={false} />
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
              <TableCell align="right">acct balance</TableCell>
              <TableCell align="right">balance here</TableCell>
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
                  {(line.date && moment.isMoment(line.date)) 
                    ? line.date.format('YYYY-MM-DD')
                    : line.date
                  }
                </TableCell>
                <TableCell align="right">{line.description}</TableCell>
                <TableCell align="right">{line.who}</TableCell>
                <TableCell align="right">{line.category}</TableCell>
                <TableCell align="right">{num(line.amount)}</TableCell>
                <TableCell align="right">{num(line.balance)}</TableCell>
                <TableCell align="right">{num(showbalances[index])}</TableCell>
                { !isasset ? <React.Fragment /> :
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
    </Paper>
  )
});
