import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { ten99, google } from '@aultfarms/accounts';
import { context } from './state';
import numeral from 'numeral';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import xlsx from 'xlsx-js-style';
import moment from 'moment';

const warn = debug('accounts#Ten99:warn');
const info = debug('accounts#Ten99:info');

function num(n: number) {
  if (Math.abs(n) < 0.01) n = 0;
  const str = numeral(n).format('$0,0.00');
  if (n < 0) {
    return <span style={{color: 'red'}}>{str}</span>
  }
  return str;
}

export const Ten99 = observer(function Ten99() {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  const displayYearSelector = () => {
    const options = [ ];
    for (const year of years) {
      options.push(<MenuItem value={year}>{year}</MenuItem>);
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'row', padding: 10, alignItems: 'center' }}>
        Year:&nbsp;
        <Select 
          onChange={(evt: SelectChangeEvent) => actions.ten99Year(evt.target.value as string)}
          value={state.ten99.year}
          label="Year"
          style={{ minWidth: '100px', maxHeight: '30px' }}
        >
          {options}
        </Select>
      </div>
    );
  };

  const curyear = moment().year();
  const startyear = curyear - 100; // Can make 1099's up to 100 years ago
  const years: number[] = [];
  for (let i=curyear; i >= startyear; i--) {
    years.push(i);
  }
  const nowstr = () => {
    return (new Date()).toISOString().replace(/T.*$/,'');
  };

  const handleUploadDownload = (direction: 'up' | 'down') => async () => {
    if (!state.ten99.result) {
      actions.activity(`Could not upload/download ten99 as it has not been computed yet.`, 'bad');
      return;
    }
    const wb = ten99.ten99ToWorkbook(state.ten99.result.ten99);
    const year = state.ten99.year;

    const filename = `${year}-12-31_Form1099_asAt${nowstr()}.xlsx`;
    const fullpath = `${state.config.ten99Location.path}/${filename}`;
    if (direction === 'up') {
      actions.activity(`Uploading file to Google at ${fullpath}...`);
      actions.ten99Msg(`Uploading file to Google at ${fullpath}...`);
      await google.uploadXlsxWorkbookToGoogle({ 
        parentpath: state.config.ten99Location.path,
        filename,
        workbook: wb,
      });
      actions.activity(`Upload successful to path ${fullpath}...`);
      actions.ten99Msg(`Upload successful to path ${fullpath}...`);
    } else {
      actions.activity(`Downloading ${filename}`);
      actions.ten99Msg(`Downloading ${filename}`);
      xlsx.writeFile(wb, filename, { bookType: 'xlsx' });
      actions.activity(`${filename} downloaded successfully`);
      actions.ten99Msg(`${filename} downloaded successfully`);
    }
  };
 
  const missing: ten99.Ten99Result['missing_people_from_required_categories'] | null = state.ten99.result?.missing_people_from_required_categories || null;

  const displayMissing = () => {
    if (!missing) return '';
    let ret: React.ReactElement[] = [];
    for (const [category, names] of Object.entries(missing)) {
      ret = [ ...ret, ...names.map((n,index) => 
        <TableRow key={`missing-row-${category}`}>
          <TableCell key={`missing-row-${category}-cell0`}>
            {index === 0 ? category : ''}
          </TableCell>
          <TableCell key={`missing-row-${category}-cell1`}>
            {n}
          </TableCell>
        </TableRow>
      ) ];
    }
    return ret;
  }
  

  return (
    <Paper elevation={1}>
      <div style={{ paddingLeft: '10px', paddingRight: '10px', display: 'flex', flexDirection: 'column' }}>
        <h1>Generate a 1099</h1>

        <div style={{ flexGrow: 1 }}></div>

        { !state.ten99.msg ? '' :
          <div style={{ paddingLeft: '10px' }}>{state.ten99.msg}</div>
        }

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>

          {displayYearSelector()}

          <Button style={{ margin: '10px' }} variant="outlined" onClick={ () => actions.computeTen99() }>
            Compute 1099 for {state.ten99.year}
          </Button>
        </div>

        { !state.ten99.result ? '' : 
          <div style={{ display: 'flex', flexDirection: 'column' }} >

            <div style={{ color: '#00BB00', fontWeight: 'bold', paddingTop: '5px', paddingBottom: '5px' }}>
              Computed 1099 contains {state.ten99.result.ten99.length} people and {Object.keys(missing || {}).length} people were found to be missing from the settings.
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <div>Save computed result:&nbsp;</div>
              <Button variant="outlined" onClick={handleUploadDownload('down')} >
                <DownloadIcon />
              </Button>
              <div style={{ width: '20px' }}></div>
              <Button variant="outlined" onClick={handleUploadDownload('up')}>
                <CloudUploadIcon />
              </Button>
            </div>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Person</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>1099 Categories</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
              {state.ten99.result.ten99.map((p,rownum) => 
                <TableRow key={`ten99resultrow-${rownum}`}>
                  <TableCell>{p.person.name}</TableCell>
                  <TableCell>{num(p.total)}</TableCell>
                  <TableCell>{p.categories.map(c=>c.name).join(', ')}</TableCell>
                </TableRow>
              )}
              </TableBody>
            </Table>
          </div>
        }

        { !missing ? '' :
          <TableContainer id="ten99-missing-container" component={Paper} sx={{ maxHeight: 700 }}>
            <h3>Missing people:</h3>
            <div>
              WARNING: these categories exist in the accounts, but these people did not get 1099's.
            </div>
            <Table stickyHeader sx={{ minWidth: 650 }} size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell>Missing Person</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                { displayMissing() }
              </TableBody> 
            </Table>
          </TableContainer>
        }
      </div>
    </Paper>
  )
});
