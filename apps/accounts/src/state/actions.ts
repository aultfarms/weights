import { action } from 'mobx';
//import type { Context } from './index.js';
import { state, ActivityMessage, State, IndexedStatements } from './state';
import { combinePrefixedMsgs } from './util';
import debug from 'debug';
import * as accountsLib from '@aultfarms/accounts';

const warn = debug("accounts#actions:warn");
const info = debug("accounts#actions:info");

export const page = action('page', (page: State['page']) => {
  state.page = page;
});


export const activity = action('activity', (msg: string | string[] | ActivityMessage | ActivityMessage[], type: ActivityMessage['type'] = 'good') => {
  if (!Array.isArray(msg)) {
    msg = [ msg ] as string[] | ActivityMessage[];
  }
  // Make sure evey element is an activity message (convert strings):
  let msgs: ActivityMessage[] = msg.map(m => {
    if (typeof m === 'object' && 'msg' in m && typeof m.msg === 'string') {
      return m as ActivityMessage;
    } else {
      return { msg: m, type} as ActivityMessage;
    }
  });
  // Combine any like-prefixed messages together:
  msgs = (combinePrefixedMsgs(msgs) as typeof msgs);
  info(msgs.map(m=>m.msg).join('\n'));
  state.activityLog = [...state.activityLog, ...msgs ]; 
});

export const errors = action('errorrs', (errs: string[]) => {
  state.errors.push(...(combinePrefixedMsgs(errs) as typeof errs));
});

export const selectedAccountName = action('selectedAccountName', (sel: string | null) => {
  state.selectedAccount.name = sel || 'All';
});
export const selectedAccountLine = action('selectedAccountLine', (line: string | number | null) => {
  if (line === null) return state.selectedAccount.line = null;
  if (typeof line === 'number') return state.selectedAccount.line = line;
  // otherwise, it's a string
  line = +(line);
  if (isNaN(line)) {
    warn('line (',line,') was a string, but it converted to NaN instead of a number');
    state.selectedAccount.line = null;
  }
  return state.selectedAccount.line = line;
});

let _stepResult: accountsLib.ledger.StepResult | null = null;
export const stepResult = action('stepResult', (step?: accountsLib.ledger.StepResult): typeof _stepResult | void => {
  if (typeof step === 'undefined') return _stepResult;
  state.stepResult.rev++;
  _stepResult = step;
});

export const ledger = action('ledger', () => {
  const sr = stepResult();
  if (state.stepResult.rev < 0) return null;
  if (!sr?.final || !sr.done) return null;
  return sr;
});

let _balancesheets: IndexedStatements<accountsLib.balance.AnnualBalanceSheet> | null = null;
export const balancesheets = action('balancesheets', (bss?: typeof _balancesheets): typeof _balancesheets | void => {
  if (typeof bss === 'undefined') return _balancesheets;
  if (state.balancesheets.rev < 0) return null;
  state.balancesheets.rev++;
  _balancesheets = bss;
  info('set balance sheets to ', bss);
});

let _profitlosses: IndexedStatements<accountsLib.profitloss.ProfitLoss> | null = null;
export const profitlosses = action('profitlosses', (pls?: typeof _profitlosses): typeof _profitlosses | void => {
  if (typeof pls === 'undefined') return _profitlosses;
  if (state.profitlosses.rev < 0) return null;
  state.profitlosses.rev++;
  _profitlosses = pls;
});

let _selectedAcctAcct: accountsLib.ledger.Account | null = null;
export const selectedAccountAcct = action('selectedAccountAcct', (saa?: typeof _selectedAcctAcct): typeof _selectedAcctAcct| void => {
  if (typeof saa === 'undefined') return _selectedAcctAcct;
  if (state.selectedAccount.acct.rev < 0) return null;
  state.selectedAccount.acct.rev++;
  _selectedAcctAcct = saa;
});

let _selectedAcctVAcct: accountsLib.ledger.ValidatedRawSheetAccount | null = null;
export const selectedAccountVAcct = action('selectedAccountVAcct', (sav?: typeof _selectedAcctVAcct): typeof _selectedAcctVAcct| void => {
  if (typeof sav === 'undefined') return _selectedAcctVAcct;
  if (state.selectedAccount.vacct.rev < 0) return null;
  state.selectedAccount.vacct.rev++;
  _selectedAcctVAcct = sav;
});

export const selectedAccountType = action('selectedAccountType', (type: 'tax' | 'mkt') => {
  state.selectedAccount.type = type;
});

export const selectedAccountCategory = action('selectedAccountCategory', (cat: string | 'All') => {
  state.selectedAccount.category = cat;
});
export const selectedAccountCategoryExact = action('selectedAccountCategoryExact', (exact: boolean) => {
  state.selectedAccount.categoryExact = exact;
});
export const selectedAccountYear = action('selectedAccountYear', (year: string | number) => {
  state.selectedAccount.year = year;
});
export const selectedAccountScroll = action('selectedAccountScroll', (scroll: number) => {
  state.selectedAccount.scroll = scroll;
});




export const balanceType = action('balanceType', (type: 'tax' | 'mkt') => {
  state.balance.type = type;
});

export const balanceLevel = action('balanceLevel', (newval: number) => {
  state.balance.level = newval;
});

export const balanceMsg = action('balanceMsg', (msg: string) => {
  state.balance.msg = msg;
});

export const balanceScroll = action('balanceScroll', (scroll: number) => {
  state.balance.scroll = scroll;
});

export const profitlossType = action('profitlossType', (type: 'tax' | 'mkt') => {
  state.profitloss.type = type;
});

export const profitlossLevel = action('profitlossLevel', (newval: number) => {
  state.profitloss.level = newval;
});

export const profitlossMsg = action('profitlossMsg', (msg: string) => {
  state.profitloss.msg = msg;
});

export const profitlossExpandYear = action('profitlossExpandYear', (y: string) => {
  state.profitloss.expandYear = y;
});

export const profitlossScroll = action('profitlossScroll', (scroll: number) => {
  state.profitloss.scroll = scroll;
});


export const ten99 = action('ten99', (newval: accountsLib.ten99.Ten99Result): void => {
  state.ten99.result = newval;
});

export const ten99Year = action('ten99Year', async (newval: string) => {
  state.ten99.year = newval;
});

export const ten99Settings = action('ten99Settings', (newval: accountsLib.ten99.Ten99Settings): void => {
  state.ten99.settings = newval;
});

export const computeTen99 = action('computeTen99', (): void => {
  const ledger = stepResult()?.final;
  if (!ledger) {
    info('Attempted to computeTen99, but there is no valid account ledger');
    return;
  }
  const year = +(state.ten99.year);
  if (!year) {
    info('Attempted to computeTen99, but there is no valid year');
    return;
  }
  const settings = state.ten99.settings;
  if (!settings) {
    info('Attempted to computeTen99, but there are no valid settings');
    return;
  }
  activity(`Computing 1099 for ${year}`, 'good');
  ten99(accountsLib.ten99.ten99({ledger, year, settings}));
  activity(`Done Computing 1099 for ${year}`, 'good');
});

export const ten99Msg = action('ten99Msg', (msg: string): void => {
  state.ten99.msg = msg;
});
