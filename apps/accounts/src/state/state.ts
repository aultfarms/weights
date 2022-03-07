import { observable, autorun } from 'mobx';
import type { ledger } from '@aultfarms/accounts';
import debug from 'debug';

const warn = debug('accounts#state:info');

export type Config = {
  accountsLocation: {
    place: 'google' | 'dir',
    path: string,
  },
  saveLocation: {
    place: 'google' | 'dir',
    path: string,
  },
};

export type ActivityMessage = {
  msg: string,
  type: 'good' | 'bad',
};


export type State = {
  page: 'activity' | 'ledger' | 'balance' | 'profit',
  config: Config,
  activityLog: ActivityMessage[],
  errors: string[],
  stepResult: ledger.StepResult | null,
  selectedAccountName: string, 
  selectedAccount: {  // computed automatically from selectedAccountName
    name: string,
    vacct?: ledger.ValidatedRawSheetAccount,
    acct?: ledger.Account,
  } | null,
};

// Figure out the config: load from localStorage, but have default
const defaultConfig: Config = {
  accountsLocation: {
    place: 'google',
    path: '/Ault Farms Shared/LiveData/Accounts'
  },
  saveLocation: {
    place: 'google',
    path: '/Ault Farms Shared/LiveData/BalanceProfitLoss'
  },
};
let config = defaultConfig;

try {
  const localConfig = JSON.parse(localStorage.getItem('accounts-config') || '');
  if (localConfig && localConfig.accountsLocation && localConfig.saveLocation) {
    config = localConfig;
  }
} catch (e) {
  // JSON parse failed
}

export const state = observable<State>({
  page: 'activity',
  config: config,
  activityLog: [],
  errors: [],
  stepResult: null,
  selectedAccountName: '',
  selectedAccount: null,
});


// Every time the state.config changes, save it to localStorage:
autorun(() => {
  localStorage.setItem('accounts-config', JSON.stringify(state.config));
});

// Keep state.selectedAccount in sync with state.selectedAccountName: you set the name,
// this will find the account and set it.
autorun(() => {
  if (!state.selectedAccountName) {
    state.selectedAccount = null;
    return;
  }
  if (!state.stepResult) {
    state.selectedAccount = null;
    return;
  }

  const name = state.selectedAccountName;
  let acct: ledger.Account | null | undefined = null;
  let vacct: ledger.ValidatedRawSheetAccount | null | undefined = null;
  if (state.stepResult.final) {
    acct = state.stepResult.final.mkt.accts.find(a => a.name === name);
    if (!acct) acct = state.stepResult.final.tax.accts.find(a => a.name === name);
    if (!acct) {
      warn('stepResult has a final, but could not find selectedAccount ', name, ' in mkt or in tax');
      state.selectedAccount = null;
      return;
    }
    state.selectedAccount = { name, acct };
    return;
  }
  if (state.stepResult.accts) {
    acct = state.stepResult.accts.find(a => a.name === name);
    if (!acct) {
      warn('stepResult has accts, but could not find selectedAccount', name);
      state.selectedAccount = null;
    }
    state.selectedAccount = { name, acct };
    return;
  }
  if (state.stepResult.vaccts) {
    vacct = state.stepResult.vaccts.find(a => a.name === name);
    if (!vacct) {
      warn('stepResult has vaccts, but could not find selectedAccount', name);
      state.selectedAccount = null;
    }
    state.selectedAccount = { name, vacct };
    return;
  }
  state.selectedAccount = null;
});

