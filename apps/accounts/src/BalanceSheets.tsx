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

const warn = debug('accounts#BalanceSheets:warn');
const info = debug('accounts#BalanceSheets:info');

function num(n: number) {
  const str = numeral(n).format('$0,0.00');
  if (n < 0) {
    return <span style={{color: 'red'}}>{str}</span>
  }
  return str;
}

export const BalanceSheets = observer(function BalanceSheets() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

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
  if (!bss) return <div>No balance sheets available yet</div>;

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

  const handleUploadDownload = (year: string, direction: 'up' | 'down') => async () => {
    const bs = bss[year]![state.balance.type];
    const wb = balance.annualBalanceSheetToWorkbook(bs);
    console.log('workbook = ', wb);
    const filename = `${year}-12-31_BalanceSheet_asAt${nowstr()}.xlsx`;
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

  const displayYearBalanceHeader = () => {
    const ret = [];
    for (const y of Object.keys(bss).sort().reverse()) {
      ret.push(
        <TableCell align="right">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'right' }}>
              <Button variant="outlined" onClick={handleUploadDownload(y, 'down')}>
                <DownloadIcon />
              </Button>
              <div style={{ width: '20px' }}></div>
              <Button variant="outlined" onClick={handleUploadDownload(y, 'up')}>
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
    for (let i=0; i < maxlevel; i++) {
      if (i === level) {
        ret.push(<TableCell>{parts[level]}</TableCell>);
      } else {
        ret.push(<TableCell></TableCell>);
      }
    }
    return ret;
  };

  const displayBalancesForCatname = (catname: string) => {
    const ret = [];
    for (const year of years) {
      let bal: string | React.ReactElement = '';
      try {
        bal = num(balance.getAccountBalance({ 
          balanceSheet: bss[year]![state.balance.type].yearend!,
          accountName: catname,
        }));
      } catch(e: any) {
        bal = '';
        // account doesn't exist
        info('Account ',catname, 'does not exist in year ', year, 'and type', state.balance.type, ' at yearend, error was: ', e);
      }
      ret.push(<TableCell align="right">{bal}</TableCell>);
    }
    return ret;
  }

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

  const importantStyle = {
    backgroundColor: 'rgba(200, 255, 120, .3)',
  };
  const imp = (catname: string) => {
    return catname.split('-').length === 1;
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
      <TableContainer component={Paper} sx={{ maxHeight: 700 }}>
        <Table stickyHeader sx={{ minWidth: 650 }} size="small">
          <TableHead>
            <TableRow>
              {displayCategoryHeader()}
              {displayYearBalanceHeader()}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRootRow()}
            {/* catnames has every possible level of cat name, in order */}
            {catnames.map((catname, index) => displayCategoryRow(catname, index))}
          </TableBody> 
        </Table>
      </TableContainer>
    </Paper>
  )
});
