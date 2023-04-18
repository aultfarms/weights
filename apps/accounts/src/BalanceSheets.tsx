import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { balance, google } from '@aultfarms/accounts';
import { context } from './state';
import numeral from 'numeral';
import Paper from '@mui/material/Paper';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import xlsx from 'xlsx-js-style';
import { maintainScroll } from './util';

const warn = debug('accounts#BalanceSheets:warn');
const info = debug('accounts#BalanceSheets:info');

function num(n: number) {
  if (Math.abs(n) < 0.01) n = 0;
  const str = numeral(n).format('$0,0.00');
  if (n < 0) {
    return <span style={{color: 'red'}}>{str}</span>
  }
  return str;
}
// Same as num, but prints things in thousands (i.e. "K").  Used for deltas.
function numK(n: number) {
  if (Math.abs(n) < 1000) return <React.Fragment />;
  n = n / 1000;
  let str = numeral(n).format('$0,0') + 'K';
  if (n > 0) str = '+'+str;
  let prefixspaces = 5
  const absn = Math.abs(n);
  if (absn >= 10) prefixspaces--;
  if (absn >= 100) prefixspaces--;
  if (n < 0) prefixspaces--;
  for (let i=0; i < prefixspaces; i++) {
    str = ' ' + str;
  }

  str = ` | (${str})`;
  if (n < 0) {
    return <span style={{color: 'red'}}>{str}</span>
  }
  return <span style={{color: 'green'}}>{str}</span>
}


export const BalanceSheets = observer(function BalanceSheets() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  maintainScroll('balancesheet-container', actions.balanceScroll, state.balance.scroll);

  const displayTypeChooser = () => {
    const toggleType = (_evt: React.MouseEvent<HTMLElement>, val: 'mkt' | 'tax') => {
      actions.balanceType(val);
    };

    return (
      <div style={{ padding: '10px' }}>
        <ToggleButtonGroup 
          color='primary'
          onChange={toggleType} 
          exclusive 
          value={state.balance.type}
        >
          <ToggleButton value="mkt">Mkt</ToggleButton>
          <ToggleButton value="tax">Tax</ToggleButton>
        </ToggleButtonGroup>
      </div>
    );
  }

  const bss = actions.balancesheets();
  const bb = actions.borrowingBase();
  if (!bss || !bb) return (
    <div style={{ margin: '10px' }}>
      <div>No balance sheets and borrowing base computed yet.</div>
      <Button 
        disabled={!state.stepResult.rev || !(actions.ledger()?.final)} 
        variant="contained" 
        onClick={() => actions.computeBalanceSheets()}
      >
        Create Balance Sheets
      </Button>
    </div>
  );

  const years = Object.keys(bss).sort().reverse();

  let catindex: { [cat: string]: true } = {};
  for (const year of years) {
    const b = bss[year]!;
    if (!b[state.balance.type].yearend) {
      warn('Balance sheet for year', year, 'and type', state.balance.type,' has no yearend!');
      continue;
    }
    balance.treeToCategoryNames(b[state.balance.type].yearend!.tree, catindex, { excludeRoot: true });
  }
  const catnames = Object.keys(catindex).sort();
  // Now figure out how many category level columns we'll need
  let numcategorylevels = 0;
  for (const c of catnames) {
    const nl = c.split('-').length;
    if (nl > numcategorylevels) {
      numcategorylevels = nl;
    }
  }
  const maxlevel = state.balance.level < numcategorylevels ? state.balance.level : numcategorylevels;

  const displayCategoryHeader = () => {
    const ret = [];
    for (let i=0; i < maxlevel; i++) {
      ret.push(
        <TableCell key={`cattablecell-${i}`}>
          Level {i+1}
        </TableCell>
      );
    }
    return ret;
  };

  const nowstr = () => {
    return (new Date()).toISOString().replace(/T.*$/,'');
  };

  const handleUploadDownload = ({ year, direction, borrowingBase} : { year: string, direction: 'up' | 'down', borrowingBase?: boolean }) => async () => {
    const bs = bss[year]![state.balance.type];
    const wb = borrowingBase ? balance.borrowingBaseToWorkbook(bb) :  balance.annualBalanceSheetToWorkbook(bs);
    const filename = borrowingBase 
      ? `${nowstr()}_BorrowingBase.xlsx`
      : `${year}-12-31_BalanceSheet_${state.balance.type.toUpperCase()}_asAt${nowstr()}.xlsx`
      
    const fullpath = `${state.config.saveLocation.path}/${filename}`;
    if (direction === 'up') {
      actions.activity(`Uploading file to Google at ${fullpath}...`);
      actions.balanceMsg(`Uploading file to Google at ${fullpath}...`);
      await google.uploadXlsxWorkbookToGoogle({ 
        parentpath: state.config.saveLocation.path,
        filename,
        workbook: wb,
      });
      actions.activity(`Upload successful to path ${fullpath}...`);
      actions.balanceMsg(`Upload successful to path ${fullpath}...`);
    } else {
      actions.activity(`Downloading ${filename}`);
      actions.balanceMsg(`Downloading ${filename}`);
      xlsx.writeFile(wb, filename, { bookType: 'xlsx' });
      actions.activity(`${filename} downloaded successfully`);
      actions.balanceMsg(`${filename} downloaded successfully`);
    }
  };

  const displayBorrowingBaseButton = () => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexGrow: 1 }} />
      <Button 
        variant="outlined" 
        size="small" 
        onClick={handleUploadDownload({ year: years[0]!, direction: 'down', borrowingBase: true })}
      >
        <DownloadIcon />
        Borrowing Base
      </Button>
      <div style={{ flexGrow: 1 }} />
    </div>
  );

  const displayYearBalanceHeader = () => {
    const ret = [];
    for (const y of Object.keys(bss).sort().reverse()) {
      ret.push(
        <TableCell align="right">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'right' }}>
              <Button variant="outlined" onClick={handleUploadDownload({ year: y, direction: 'down' })}>
                <DownloadIcon />
              </Button>
              <div style={{ width: '20px' }}></div>
              <Button variant="outlined" onClick={handleUploadDownload({ year: y, direction: 'up' })}>
                <CloudUploadIcon />
              </Button>
            </div>
            {y} Balance
          </div>
        </TableCell>
      );
    }
    return ret;
  };
      
  const displayNameCellsForCatname = (catname: string) => {
    const ret = [];
    const parts = catname.split('-');
    const level = parts.length - 1;
    const navigate = () => {
      actions.page('ledger');
      actions.selectedAccountName(catname);
    }
    for (let i=0; i < maxlevel; i++) {
      if (i === level && catname !== 'root') {
        ret.push(<TableCell key={`namecells=${i}`}><a href="#" onClick={navigate}>{parts[level]}</a></TableCell>);
      } else {
        ret.push(<TableCell key={`namecells=${i}`}></TableCell>);
      }
    }
    return ret;
  };

  const emptyStyle = { backgroundColor: '#FFCCFF' };
  const displayBalancesForCatname = (catname: string) => {
    const ret = [];
    for (const year of years) {
      let bal: string | React.ReactElement = '';
      let delta: string | React.ReactElement = '';
      try {
        let balnum = balance.getAccountBalance({ 
          balanceSheet: bss[year]![state.balance.type].yearend!,
          accountName: catname,
        });
        bal = num(balnum);
        if (bss[+(year)-1]?.[state.balance.type].yearend) {
          const prevbalnum = balance.getAccountBalance({ 
            balanceSheet: bss[+(year)-1]![state.balance.type].yearend!,
            accountName: catname,
          });
          delta = numK(balnum - prevbalnum);
        }
      } catch(e: any) {
        bal = '';
        // account doesn't exist
        info('Account ',catname, 'does not exist in year ', year, 'and type', state.balance.type, ' at yearend, error was: ', e);
      }
      ret.push(<TableCell style={!bal ? emptyStyle : {}} align="right">{bal}{delta}</TableCell>);
    }
    return ret;
  }
/*
  const displayRootRow = () => {
    const ret = [];
    for (let i=0; i < maxlevel; i++) {
      ret.push(<TableCell/>);
    }
    for (const year of years) {
      const bal = num(bss[year]![state.balance.type].yearend!.tree.balance);
      ret.push(<TableCell align="right">{bal}</TableCell>);
    }
    return <TableRow>{ret}</TableRow>;
  }
*/
  const importantStyle = {
    backgroundColor: 'rgba(200, 255, 120, .3)',
  };
  const imp = (catname: string) => {
    return catname.split('-').length === 1 && catname !== 'root';
  };

  const displayCategoryRow = (catname: string, index: number) => {
    const level = catname.split('-').length;
    if (level > state.balance.level) return <React.Fragment />;
    return (
      <TableRow
        key={`catbalanceline-${index}`}
        id={`balancecat-${catname}`}
        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
        style={imp(catname) ? importantStyle : {}}
      >
        {displayNameCellsForCatname(catname)}
        {displayBalancesForCatname(catname)}
      </TableRow>
    );
  };

  const marks = [];
  for (let i=0; i < numcategorylevels; i++) {
    marks.push({ value: i+1, label: ''+(i+1) });
  }
 
  return (
    <Paper elevation={1}>
      <div style={{ paddingLeft: '10px', paddingRight: '10px', display: 'flex', flexDirection: 'row' }}>
        <h1>Balance Sheet - {state.balance.type === 'mkt' ? 'Market' : 'Tax'}</h1>
        <div style={{width: '20px'}}></div>
        {state.balance.type === 'mkt' ? displayBorrowingBaseButton() : <React.Fragment /> }
        <div style={{ flexGrow: 1 }}></div>
        {displayTypeChooser()}
        <div>
          <div style={{ paddingTop: '10px' }}>View Level:</div>
          <Slider 
            sx={{ maxWidth: '200px'}}
            label="Level" 
            value={state.balance.level}
            min={1}
            max={numcategorylevels}
            marks={marks}
            onChange={(_evt: Event, newval: number) => actions.balanceLevel(newval)} 
          />
        </div>
        <div style={{width: '20px'}}></div>
      </div>
      { !state.balance.msg ? '' :
        <div style={{ paddingLeft: '10px' }}>{state.balance.msg}</div>
      }
      <TableContainer id="balancesheet-container" component={Paper} sx={{ maxHeight: 700 }}>
        <Table stickyHeader sx={{ minWidth: 650 }} size="small">
          <TableHead>
            <TableRow>
              {displayCategoryHeader()}
              {displayYearBalanceHeader()}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayCategoryRow('root', 0)}
            {/* catnames has every possible level of cat name, in order */}
            {catnames.map((catname, index) => displayCategoryRow(catname, index))}
          </TableBody> 
        </Table>
      </TableContainer>
    </Paper>
  )
});
