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


const warn = debug('accounts#RawAccountsChooser:warn');
const info = debug('accounts#RawAccountsChooser:info');

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

  const sr = actions.stepResult(); 
  // access state.stepResult.rev so we are updated when it changes
  if (!state.stepResult || state.stepResult.rev < 0 || !sr) {
    warn('WARNING: have no step result');
    return <React.Fragment />;
  }

  let accts: ledger.Account[] | ledger.ValidatedRawSheetAccount[] | null = null;
  if (sr.final) {
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
    return <Autocomplete
      disablePortal
      id="account-chooser"
      options={options}
      sx={{ width: 500 }}
      renderInput={(params) => <TextField {...params} label="Choose account to view" />}
      autoSelect
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
    return <Autocomplete
      disablePortal
      id="category-chooser"
      options={options}
      sx={{ width: 500 }}
      renderInput={(params) => <TextField {...params} label="Filter to Category" />}
      autoSelect
      value={state.selectedAccount.category || 'All'}
      onChange={onChange}
      style={{ padding: '10px' }}
    />;
  }

  const displayAcct = () => {
    const saa = actions.selectedAccountAcct();
    const sav = actions.selectedAccountVAcct();
    if (saa) {
      return (
        <AcctViewer 
          acct={saa} 
          centerline={state.selectedAccount.line} 
          categoryFilter={state.selectedAccount.category} 
        />
      );
    }
    if (sav) {
      return (
        <AcctViewer 
          vacct={sav} 
          centerline={state.selectedAccount.line} 
          categoryFilter={state.selectedAccount.category} 
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
        <div style={{ flexGrow: 1 }}></div>
        {displayTypeChooser()}
      </div>
      {displayAcct()}
    </div>
  );
});
