import { action } from 'mobx';
//import type { Context } from './index.js';
import { state, ActivityMessage, State, IndexedStatements } from './state';
import { combinePrefixedMsgs } from './util';
import debug from 'debug';
import type * as accountsLib from '@aultfarms/accounts';

export { onInitialize } from './initialize';


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
  state.activityLog = [...state.activityLog, ...msgs ]; });

export const errors = action('errorrs', (errs: string[]) => {
  state.errors.push(...(combinePrefixedMsgs(errs) as typeof errs));
});

export const selectedAccountName = action('selectedAccountName', (sel: string | null) => {
  state.selectedAccountName = sel || '';
});
export const selectedAccountLine = action('selectedAccountLine', (line: string | number | null) => {
  if (line === null) return state.selectedAccountLine = null;
  if (typeof line === 'number') return state.selectedAccountLine = line;
  // otherwise, it's a string
  line = +(line);
  if (isNaN(line)) {
    warn('line (',line,') was a string, but it converted to NaN instead of a number');
    state.selectedAccountLine = null;
  }
  return state.selectedAccountLine = line;
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

export const balanceType = action('balanceType', (type: 'tax' | 'mkt') => {
  state.balance.type = type;
});

export const balanceLevel = action('balanceLevel', (newval: number) => {
  state.balance.level = newval;
});

export const balanceMsg = action('balanceMsg', (msg: string) => {
  state.balance.msg = msg;
});
