import { observable, autorun } from 'mobx';
import type { ledger } from '@aultfarms/accounts';

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
  config: Config,
  activityLog: ActivityMessage[],
  errors: string[],
  stepResult: ledger.StepResult | null,
  selectedStepAccount: { 
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
  // For config:
  config: config,
  activityLog: [],
  errors: [],
  stepResult: null,
  selectedStepAccount: null,
});


// Every time the state.config changes, save it to localStorage:
autorun(() => {
  localStorage.setItem('accounts-config', JSON.stringify(state.config));
});


