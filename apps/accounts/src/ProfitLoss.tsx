import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { profitloss, google } from '@aultfarms/accounts';
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
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import xlsx from 'xlsx-js-style';
import { maintainScroll } from './util';

const warn = debug('accounts#ProfitLoss:warn');
const info = debug('accounts#ProfitLoss:info');

function num(n: number) {
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


export const ProfitLoss = observer(function ProfitLoss() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  maintainScroll('profitloss-container', actions.profitlossScroll, state.profitloss.scroll);

  const displayTypeChooser = () => {
    const toggleType = (_evt: React.MouseEvent<HTMLElement>, val: 'mkt' | 'tax') => {
      actions.profitlossType(val);
    };

    return (
      <div style={{ padding: '10px' }}>
        <ToggleButtonGroup 
          color='primary'
          onChange={toggleType} 
          exclusive 
          value={state.profitloss.type}
        >
          <ToggleButton value="mkt">Mkt</ToggleButton>
          <ToggleButton value="tax">Tax</ToggleButton>
        </ToggleButtonGroup>
      </div>
    );
  }

  const displayYearSelector = () => {
    const options = [ <MenuItem value={''}>None</MenuItem> ];
    for (const year of years) {
      options.push(<MenuItem value={year}>{year}</MenuItem>);
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', padding: 10 }}>
        Year:
        <Select 
          onChange={(evt: SelectChangeEvent) => actions.profitlossExpandYear(evt.target.value as string)}
          value={state.profitloss.expandYear}
          label="Year"
          style={{ minWidth: '100px', maxHeight: '30px' }}
        >
          {options}
        </Select>
      </div>
    );
  };

  const pls = actions.profitlosses();
  if (!pls) return <div>No profit/loss statements available yet</div>;

  let years = Object.keys(pls).sort().reverse();
  let showyears = years;
  if (state.profitloss.expandYear) {
    showyears = [ state.profitloss.expandYear ];
  }

  let catindex: { [cat: string]: true } = {};
  for (const year of years) {
    const p = pls[year]!;
    if (!p[state.profitloss.type]?.categories) {
      warn('WARNING: profit loss for year ', year, ' and type ', state.profitloss.type, ' does not exist!');
      continue;
    }
    profitloss.treeToCategoryNames(p[state.profitloss.type].categories, catindex, { excludeRoot: true });
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
  const maxlevel = state.profitloss.level < numcategorylevels ? state.profitloss.level : numcategorylevels;

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
    const pl = pls[year]![state.profitloss.type];
    const wb = profitloss.profitLossToWorkbook(pl);
    const filename = `${year}-12-31_ProfitLoss_asAt${nowstr()}.xlsx`;
    const fullpath = `${state.config.saveLocation.path}/${filename}`;
    if (direction === 'up') {
      actions.activity(`Uploading file to Google at ${fullpath}...`);
      actions.profitlossMsg(`Uploading file to Google at ${fullpath}...`);
      await google.uploadXlsxWorkbookToGoogle({ 
        parentpath: state.config.saveLocation.path,
        filename,
        workbook: wb,
      });
      actions.activity(`Upload successful to path ${fullpath}...`);
      actions.profitlossMsg(`Upload successful to path ${fullpath}...`);
    } else {
      actions.activity(`Downloading ${filename}`);
      actions.profitlossMsg(`Downloading ${filename}`);
      xlsx.writeFile(wb, filename, { bookType: 'xlsx' });
      actions.activity(`${filename} downloaded successfully`);
      actions.profitlossMsg(`${filename} downloaded successfully`);
    }
  };

  const displayYearTotalsHeader = () => {
    const ret = [];
    for (const y of showyears.sort().reverse()) {
      if (y === state.profitloss.expandYear) {
        ret.push(<TableCell align="right" valign="bottom">{y} Debit</TableCell>);
        ret.push(<TableCell align="right" valign="bottom">{y} Credit</TableCell>);
      }
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
            {y} Net
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
      actions.selectedAccountCategory(catname);
    }
    for (let i=0; i < maxlevel; i++) {
      if (i === level && catname !== 'root') {
        ret.push(<TableCell><a href="#" onClick={navigate}>{parts[level]}</a></TableCell>);
      } else {
        ret.push(<TableCell></TableCell>);
      }
    }
    return ret;
  };

  const emptyStyle = { backgroundColor: '#FFCCFF' };
  const displayAmountsForCatname = (catname: string | 'root') => {
    const ret = [];
    for (const year of showyears) {
      let amt: string | React.ReactElement = '';
      let dbt: string | React.ReactElement = '';
      let cdt: string | React.ReactElement = '';
      let deltanum: null | number = null;
      const pl = pls[year]![state.profitloss.type];
      let prevpl = null;
      if (pls[+(year)-1]) prevpl = pls[+(year)-1]![state.profitloss.type];
      try {
        const cat = profitloss.getCategory(pl.categories, catname);
        const prevcat = !prevpl ? null : profitloss.getCategory(prevpl.categories, catname);

        if (!cat) {
          throw new Error(`Category ${catname} not found`);
        }
        if (year === state.profitloss.expandYear) {
          dbt = num(profitloss.debit(cat));
          cdt = num(profitloss.credit(cat));
        }
        const amtnum = profitloss.amount(cat);
        amt = num(amtnum);
        if (prevcat) {
          deltanum = amtnum - profitloss.amount(prevcat);
        }
      } catch(e: any) {
        deltanum = null;
        amt = '';
        dbt = '';
        cdt = '';
      }
      const delta = !deltanum ? <React.Fragment /> : numK(deltanum);
      if (year === state.profitloss.expandYear) {
        ret.push(<TableCell style={!dbt ? emptyStyle : {}} align="right">{dbt}</TableCell>);
        ret.push(<TableCell style={!cdt ? emptyStyle : {}}align="right">{cdt}</TableCell>);
      }
      ret.push(<TableCell style={!amt ? emptyStyle : {}} align="right">{amt}{delta}</TableCell>);
    }
    return ret;
  }

  const importantStyle = {
    backgroundColor: 'rgba(200, 255, 120, .3)',
  };
  const imp = (catname: string) => {
    return catname.split('-').length === 1 && catname !== 'root';
  };

  const notZeroStyle = { backgroundColor: '#FFCCCC' };
  const displayCategoryRow = (catname: string, index: number) => {
    const level = catname.split('-').length;
    if (level > state.profitloss.level) return <React.Fragment />;

    // transfers and loan-principal should be net $0, color them red if not
    let style = imp(catname) ? importantStyle : {};
    if (
      catname.match(/transfer/) ||  // anything transfer should be zeros all the way down
      catname.match('loan') ||      // loan-principal should be zero, so light up loan as red too if it's not
      (catname.match(/-payment$/) && state.profitloss.type === 'mkt')  // any -payment from invoices should be zero only in mkt (invoice accounts don't show up in tax)
    ) {
      // Want "red" on top-level loan category if loan-principal is not zero,
      // so we have to check here for all situations
      if (!catname.match('loan') || catname === 'loan' || catname.match('loan-principal')) {
        let matchcatname = catname;
        if (catname === 'loan') { // loan should only be read if "loan-principal" below it will be red
          matchcatname = 'loan-principal';
        }
        for (const year of showyears) {
          const tree = pls[year]![state.profitloss.type].categories;
          const cattree = profitloss.getCategory(tree, matchcatname);
          if (!cattree) continue; // category is not in this one
          const amt = profitloss.amount(cattree);
          if (!(Math.abs(amt) < 0.01)) {
            info('transfer/loan/payment category ',catname,'is not $0');
            style = notZeroStyle;
            break; // no need to keep looking
          }
        }
      }
    }

    return (
      <TableRow
        key={`catprofitlossline-${index}`}
        id={`profitlosscat-${catname}`}
        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
        style={style}
      >
        {displayNameCellsForCatname(catname)}
        {displayAmountsForCatname(catname)}
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
        <h1>Profit/Loss - {state.profitloss.type === 'mkt' ? 'Market' : 'Tax'}</h1>
        <div style={{ flexGrow: 1 }}></div>
        {displayTypeChooser()}
        {displayYearSelector()}
        <div>
          <div style={{ paddingTop: '10px' }}>View Level:</div>
          <Slider 
            sx={{ maxWidth: '200px'}}
            label="Level" 
            value={state.profitloss.level}
            min={1}
            max={numcategorylevels}
            marks={marks}
            onChange={(_evt: Event, newval: number) => actions.profitlossLevel(newval)} 
          />
        </div>
        <div style={{width: '20px'}}></div>
      </div>
      { !state.profitloss.msg ? '' :
        <div style={{ paddingLeft: '10px' }}>{state.profitloss.msg}</div>
      }
      <TableContainer id="profitloss-container" component={Paper} sx={{ maxHeight: 700 }}>
        <Table stickyHeader sx={{ minWidth: 650 }} size="small">
          <TableHead>
            <TableRow>
              {displayCategoryHeader()}
              {displayYearTotalsHeader()}
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
