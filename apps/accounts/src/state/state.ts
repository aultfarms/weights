import { observable, autorun } from 'mobx';
import type { ledger } from '@aultfarms/accounts';
import { stepResult } from './actions';
import debug from 'debug';

const warn = debug('accounts#state:warn');
const info = debug('accounts#state:info');

// year-indexed balance sheets and profit/loss statements (tax & mkt)
export type IndexedStatements<T> = {
  [year: string]: {
    tax: T,
    mkt: T,
  }
};

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

// things that are too big to fit in the state without crashing browser
export type BigData = { rev: number };


export type State = {
  page: 'activity' | 'ledger' | 'balance' | 'profit',
  config: Config,
  activityLog: ActivityMessage[],
  errors: string[],
  stepResult: BigData,
  selectedAccountName: string, 
  selectedAccountLine: number | null, 
  selectedAccount: {  // computed automatically from selectedAccountName
    name: string,
    vacct?: ledger.ValidatedRawSheetAccount,
    acct?: ledger.Account,
  } | null,
  balancesheets: BigData,
  profitlosses: BigData,
  balance: {
    type: 'mkt' | 'tax',
    level: number,
    msg: string,
  }
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
  stepResult: { rev: 0 },
  selectedAccountName: '',
  selectedAccountLine: null,
  selectedAccount: null,
  balancesheets: { rev: 0 },
  profitlosses: { rev: 0 },
  balance: {
    type: 'mkt',
    level: 4,
    msg: '',
  },
});

// Every time the state.config changes, save it to localStorage:
autorun(() => {
  localStorage.setItem('accounts-config', JSON.stringify(state.config));
});

// Keep state.selectedAccount in sync with state.selectedAccountName: you set the name,
// this will find the account and set it.
autorun(() => {
  info('autorunning account determiner from account name');
  if (!state.selectedAccountName) {
    state.selectedAccount = null;
    return;
  }
  const sr = stepResult();
  // access state.stepResult so that we are properly autorun when it changes
  if (!sr || state.stepResult.rev < 0) {
    state.selectedAccount = null;
    return;
  }

  const name = state.selectedAccountName;
  let acct: ledger.Account | null | undefined = null;
  let vacct: ledger.ValidatedRawSheetAccount | null | undefined = null;
  if (sr.final) {
    acct = sr.final.mkt.accts.find(a => a.name === name);
    if (!acct) acct = sr.final.tax.accts.find(a => a.name === name);
    if (!acct) {
      warn('stepResult has a final, but could not find selectedAccount ', name, ' in mkt or in tax');
      state.selectedAccount = null;
      return;
    }
    state.selectedAccount = { name, acct };
    return;
  }
  if (sr.accts) {
    acct = sr.accts.find(a => a.name === name);
    if (!acct) {
      warn('stepResult has accts, but could not find selectedAccount', name);
      state.selectedAccount = null;
    }
    state.selectedAccount = { name, acct };
    return;
  }
  if (sr.vaccts) {
    vacct = sr.vaccts.find(a => a.name === name);
    if (!vacct) {
      warn('stepResult has vaccts, but could not find selectedAccount', name);
      state.selectedAccount = null;
    }
    state.selectedAccount = { name, vacct };
    return;
  }
  state.selectedAccount = null;
});

/*
autorun(() => {
  if (state.stepResult?.done && state.stepResult?.final) {
    state.ledger = state.stepResult.final;
  }
});*/
