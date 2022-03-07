import * as React from 'react';
import { observer } from 'mobx-react-lite';
import debug from 'debug';
import { context } from './state';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { VAcctViewer } from './VAcctViewer';

const warn = debug('accounts#RawAccountsChooser:info');

export const RawAccountChooser = observer(function RawAccountChooser(): React.ReactElement {
  const ctx = React.useContext(context);
  const { state, actions } = ctx;
  const step = state.stepResult;

  if (!step) return <React.Fragment />;

  const chooseAccount = () => {
    type Option = typeof state.selectedStepAccount;
    let options: Option[] = []; 
    if (step.final) {
      options = [ 
        ...options, 
        ...(step.final.tax.accts.map(acct => ({ name: acct.name, acct } as Option))),
        ...(step.final.mkt.accts.map(acct => ({ name: acct.name, acct } as Option))),
      ];
    }
    else if (step.accts) {
      options = [
        ...options,
        ...(step.accts.map(acct => ({ name: acct.name, acct } as Option))),
      ];
    }
    else if (step.vaccts) {
      options = [
        ...options,
        ...(step.vaccts.map(vacct => ({ name: vacct.name, vacct } as Option))),
      ];
    } else { // not much to show...
      return <React.Fragment />;
    }

    const onChange = (evt: any, newval: Option) => {
      actions.selectedStepAccount(newval);
    };

    return <Autocomplete
      disablePortal
      id="account-chooser"
      options={options}
      sx={{ width: 500 }}
      getOptionLabel={(opt) => opt?.name || 'none'}
      renderInput={(params) => <TextField {...params} label="Choose step account to view" />}
      autoSelect
      value={state.selectedStepAccount}
      onChange={onChange}
      style={{ padding: '10px' }}
    />;
  };

  const displayVacct = () => {
    if (!state.selectedStepAccount || !state.selectedStepAccount.vacct) return <React.Fragment />;
    const vacct = state.selectedStepAccount.vacct;
    return <VAcctViewer vacct={vacct} />
  };

  const displayAcct = () => {
    if (!state.selectedStepAccount || !state.selectedStepAccount.acct) return <React.Fragment />;
    const acct = state.selectedStepAccount.acct;
    return <React.Fragment>
      Selected acct {acct.name}.
    </React.Fragment>
  };


  return (
    <div>
      <div>
        {chooseAccount()}
      </div>
      {displayVacct()}
      {displayAcct()}
    </div>
  );
});
