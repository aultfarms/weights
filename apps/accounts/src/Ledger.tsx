import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { context } from './state';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { AcctViewer } from './AcctViewer';

const warn = debug('accounts#RawAccountsChooser:info');

export const Ledger = observer(function Ledger(): React.ReactElement {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;
  const step = state.stepResult;

  if (!step) return <React.Fragment />;

  const chooseAccount = () => {
    // Since you can choose an account at the end (with "final") and after intermediate processing steps
    // that may have failed, this has to deal with which "state" are you in to determine which 
    // accounts it can list and what type of account you will be displaying
    let options: string[] = []; 
    if (step.final) {
      options = [ 
        ...options, 
        ...(step.final.tax.accts.map(acct => acct.name)),
        ...(step.final.mkt.accts.map(acct => acct.name)),
      ];
    }
    else if (step.accts) {
      options = [
        ...options,
        ...(step.accts.map(acct => acct.name)),
      ];
    }
    else if (step.vaccts) {
      options = [
        ...options,
        ...(step.vaccts.map(vacct => vacct.name)),
      ];
    } else { // not much to show...
      return <React.Fragment />;
    }
    // remove any duplicate names (like between tax and mkt in final).  Note that
    // if the name is the same in tax and mkt, then it is the same account in both tax and mkt
    // so there is no need to keep both names.
    options.filter((value, index, self) => {
      return self.indexOf(value) === index;
    });


    // note that evt starts with an underscore, that tells typescript I know it isn't used
    const onChange = (_evt: any, name: string | null) => {
      actions.selectedAccountName(name);
    };

    return <Autocomplete
      disablePortal
      id="account-chooser"
      options={options}
      sx={{ width: 500 }}
      renderInput={(params) => <TextField {...params} label="Choose step account to view" />}
      autoSelect
      value={state.selectedAccountName}
      onChange={onChange}
      style={{ padding: '10px' }}
    />;
  };

  const displayAcct = () => {
    if (!state.selectedAccount) return <React.Fragment />;
    if (state.selectedAccount.acct) return <AcctViewer acct={state.selectedAccount.acct} />;
    if (state.selectedAccount.vacct) return <AcctViewer vacct={state.selectedAccount.vacct} />;
    return <React.Fragment />;
  };

  return (
    <div>
      <div>
        {chooseAccount()}
      </div>
      {displayAcct()}
    </div>
  );
});
