import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import type { ledger } from '@aultfarms/accounts';
import { context } from './state';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { AcctViewer } from './AcctViewer';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { selectedAccountName } from './state/actions';
import moment from 'moment';


const warn = debug('accounts#RawAccountsChooser:warn');
const info = debug('accounts#RawAccountsChooser:info');
const trace = debug('accounts#RawAccountsChooser:trace');

function linesToUniqueCategoryNamesArray(lines: ledger.AccountTx[] | ledger.ValidatedRawTx[]): string[] {
  const catindex: { [cat: string]: true } = {};
  for (const l of lines) {
    if (l.category) {
      // Make every possible category up to and including the full category
      let cat = '';
      for (const part of l.category.split('-')) {
        if (cat) cat += '-';
        cat += part;
        catindex[cat] = true;
      }
    }
  }
  return Object.keys(catindex).sort();
}

export const Ledger = observer(function Ledger(): React.ReactElement {

  const ctx = React.useContext(context);
  const { state, actions } = ctx;

  // For some reason, mobx locks the page if we initialize the selectedAccount.name to 'All'.
  // Trying a one-time useEffect to see if we can select All just on the first run
  React.useEffect(() => { if (!state.selectedAccount.name) selectedAccountName('All') }, []); // array means run once

  const sr = actions.stepResult(); 
  // access state.stepResult.rev so we are updated when it changes
  if (!state.stepResult || state.stepResult.rev < 0 || !sr) {
    warn('WARNING: have no step result');
    return <React.Fragment />;
  }

  let accts: ledger.Account[] | ledger.ValidatedRawSheetAccount[] | null = null;
  if (sr.final) {
    trace('Have final account, using that for list of all accounts');
    accts = sr.final[state.selectedAccount.type].accts;
  } else if (sr.accts) {
    accts = sr.accts.filter(a => {
      switch(state.selectedAccount.type) {
        case 'mkt': return a.settings.mktonly;
        case 'tax': return a.settings.taxonly;
      }
    });
  } else if (sr.vaccts) {
    accts = sr.vaccts;
  };

  const chooseAccount = () => {
    if (!accts || accts.length < 1) {
      return <div>No accounts available</div>
    }
    const options: string[] = [ 
      'All',
      ...accts.map(a => a.name)
    ];
    /*
    // Shouldn't be any duplicates now that we specified tax vs. mkt
    options.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    */

    // note that evt starts with an underscore, that tells typescript I know it isn't used
    const onChange = (_evt: any, name: string | null) => {
      actions.selectedAccountName(name);
    };
    /*
    const onKeyDown = (evt: any) => {
      if (evt.key === 'Enter') {
        evt.defaultMuiPrevented = true;
        actions.selectedAccountName(evt.target.value);
        evt.target.blur();
      }
    };
    */
    return <Autocomplete
      disablePortal
      id="account-chooser"
      options={options}
      sx={{ width: 500 }}
      renderInput={(params) => <TextField {...params} label="Choose account to view" />}
      autoSelect
      autoHighlight
      value={state.selectedAccount.name || 'All'}
      onChange={onChange}
      style={{ padding: '10px' }}
    />;
  };

  const displayTypeChooser = () => {
    const toggleType = (_evt: React.MouseEvent<HTMLElement>, val: 'mkt' | 'tax') => {
      actions.selectedAccountType(val);
    };

    return (
      <div style={{ padding: '10px' }}>
        <ToggleButtonGroup 
          color='primary'
          onChange={toggleType} 
          exclusive 
          value={state.selectedAccount.type}
        >
          <ToggleButton value="mkt">Mkt</ToggleButton>
          <ToggleButton value="tax">Tax</ToggleButton>
        </ToggleButtonGroup>
      </div>
    );
  }

  const displayYearSelector = () => {
    const years = [];
    const end = moment().year()+2;
    for (let i=2016; i <= end; i++) {
      years.push(i);
    }
    const options = [ <MenuItem value={''}>None</MenuItem> ];
    for (const year of years) {
      options.push(<MenuItem value={year}>{year}</MenuItem>);
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', padding: 10 }}>
        Year:
        <Select 
          onChange={(evt: SelectChangeEvent) => actions.selectedAccountYear(evt.target.value as string)}
          value={state.selectedAccount.year+''}
          label="Year"
          style={{ minWidth: '100px', maxHeight: '30px' }}
        >
          {options}
        </Select>
      </div>
    );
  };


  const saa = actions.selectedAccountAcct();
  const sav = actions.selectedAccountVAcct();
  const displayCategoryFilter = () => {
    if (!saa && !sav) return <React.Fragment/>;
    const categories = saa 
      ? linesToUniqueCategoryNamesArray(saa.lines)
      : sav 
        ? linesToUniqueCategoryNamesArray(sav.lines) 
        : [];
    let options: string[] = [ 'All', ...categories ];

    // note that evt starts with an underscore, that tells typescript I know it isn't used
    const onChange = (_evt: any, name: string | null) => {
      actions.selectedAccountCategory(name || 'All');
    };
    const onKeyDown = (evt: any) => {
      if (evt.key === 'Enter') {
        evt.defaultMuiPrevented = true;
        actions.selectedAccountCategory(evt.target.value);
        evt.target.blur();
      }
    };
    return <Autocomplete
      disablePortal
      id="category-chooser"
      options={options}
      sx={{ width: 500 }}
      renderInput={(params) => <TextField {...params} label="Filter to Category" />}
      autoSelect
      value={state.selectedAccount.category || 'All'}
      onChange={onChange}
      onKeyDown={onKeyDown}
      style={{ padding: '10px' }}
    />;
  }

  const displayCategoryExactCheckbox = () => {
    if (!saa && !sav) return <React.Fragment/>;
    const checked = state.selectedAccount.categoryExact;
    const onChange = (evt: any) => {
      actions.selectedAccountCategoryExact(evt.target.checked);
    };
    return (
      <FormGroup>
        <FormControlLabel labelPlacement="bottom" control={<Checkbox onChange={onChange} checked={checked}/>} label="Exact?" />
      </FormGroup>
    );
  }

  const displayAcct = () => {
    const saa = actions.selectedAccountAcct();
    const sav = actions.selectedAccountVAcct();
    if (saa) {
      trace('Using Acct');
      return (
        <AcctViewer 
          acct={saa}
          accts={accts ? (accts as ledger.Account[]) : null}
          centerline={state.selectedAccount.line} 
          categoryFilter={state.selectedAccount.category} 
          categoryExact={state.selectedAccount.categoryExact}
          year={state.selectedAccount.year}
        />
      );
    }
    if (sav) {
      trace('Using VAcct');
      return (
        <AcctViewer 
          vacct={sav} 
          centerline={state.selectedAccount.line} 
          categoryFilter={state.selectedAccount.category} 
          categoryExact={state.selectedAccount.categoryExact}
          year={state.selectedAccount.year}
        />
      );
    }
    return <React.Fragment />;
  };

  return (
    <div>
      <div style={{ paddingLeft: '10px', paddingRight: '10px', display: 'flex', flexDirection: 'row' }}>
        {chooseAccount()}
        {(saa || sav) ? displayCategoryFilter() : <React.Fragment/>}
        {(saa || sav) ? displayCategoryExactCheckbox() : <React.Fragment/>}
        <div style={{ flexGrow: 1 }}></div>
        {displayTypeChooser()}
        {displayYearSelector()}
      </div>
      {displayAcct()}
    </div>
  );
});
