import { action, runInAction } from 'mobx';
//import type { Context } from './index.js';
import { state, ActivityMessage, State, IndexedStatements } from './state';
import { combinePrefixedMsgs } from './util';
import debug from 'debug';
import * as accountsLib from '@aultfarms/accounts';
import chalk from 'chalk'
import moment, { type Moment } from 'moment';

const { magenta, green } = chalk;
const warn = debug("accounts#actions:warn");
const info = debug("accounts#actions:info");

async function breakExecution() { return new Promise(resolve => setTimeout(resolve, 1)); }

export const page = action('page', (page: State['page']) => {
  state.page = page;
});

export const modal = action('modal', (modal: State['modal']) => {
  state.modal = modal;
});


export const accountsPath = action('accountsPath', (loc: string) => {
  state.config.accountsLocation.path = loc;
  localStorage.setItem('accounts-config', JSON.stringify(state.config));
  state.modal = 'none';
  state.page = 'activity'; // so they can see the reload message
  activity('Accounts location changed, this will take effect on next page load.');
  activity('Reloading page in 3 seconds...');
  setTimeout(() => { window.location.reload(); }, 3000);
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

export const errors = action('errors', (errs: string[]) => {
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

export const computeBalanceSheets = action('computeBalanceSheets', async () => {
  try {
    page('activity');
    const now = (new Date()).getFullYear();
    activity(magenta('******** balance sheet ********'));
    let bss: IndexedStatements<accountsLib.balance.AnnualBalanceSheet> = {};
    const final = ledger()?.final;
    if (!final) {
      activity('WARNING: tried to make a balance sheet, but accounts were not yet valid.');
      return;
    }
    for (let year=2020; year <= now; year++) {
      activity(`Creating balance sheet for year ${green(year)}`);
      await breakExecution();
      bss[year] = {
        tax: await accountsLib.balance.annualBalanceSheet({ year, type: 'tax', ledger: final }),
        mkt: await accountsLib.balance.annualBalanceSheet({ year, type: 'mkt', ledger: final }),
      };
    }
    activity('Registering balance sheets...');
    await breakExecution();
    balancesheets(bss);
    activity('Successfully created balance sheets');
    page('balance');
  } catch(e: any) {
    warn('Could not create balance sheets, error = ', e);
    if (typeof e.msgs === 'function') {
      activity(e.msgs(), 'bad');
      errors(e.msgs());
      
    } else if (typeof e.message === 'string') {
      activity(e.message, 'bad');
    }
    activity('Error: could not create balance sheets', 'bad');
    return;
  }
});

export const computeProfitLoss = action('computeProfitLoss', async () => {
  try {
    page('activity');
    const now = (new Date()).getFullYear();
    activity(magenta('******** profit/loss statements ********'));
    let pls: IndexedStatements<accountsLib.profitloss.ProfitLoss> = {};
    const final = ledger()?.final;
    if (!final) {
      activity('WARNING: tried to make a balance sheet, but accounts were not yet valid.');
      return;
    }
    for (let year=2020; year <= now; year++) {
      activity(`Creating profit/loss statement for year ${green(year)}`);
      await breakExecution();
      pls[year] = {
        tax: accountsLib.profitloss.profitLoss({ year, type: 'tax', ledger: final }),
        mkt: accountsLib.profitloss.profitLoss({ year, type: 'mkt', ledger: final }),
      };
    }
    activity('Registering profit/loss statements...');
    await breakExecution();
    profitlosses(pls);
    activity('Successfully created profit/loss statements');
    page('profit');
  } catch(e: any) {
    warn('Could not create profit/loss statements, error = ', e);
    if (typeof e.msgs === 'function') {
      activity(e.msgs(), 'bad');
      errors(e.msgs());
      
    } else if (typeof e.message === 'string') {
      activity(e.message, 'bad');
    }
    activity('Error: could not create profit/loss statements', 'bad');
    return;
  }
});

//---------------------------------------------------------------
// Ten99
//---------------------------------------------------------------


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


//---------------------------------------------------------------
// Inventory
//---------------------------------------------------------------

export const runInventory = action('runInventory', async () => {
  try { 
    activity(magenta('***************   inventory   *******************'));
    await breakExecution();
    runInAction(() => state.inventory.state = 'running');
    const finalaccts = ledger()?.final;
    if (!finalaccts) return null;
    const today = moment(state.inventory.today, 'YYYY-MM-DD');
    activity('Checking for missing lines...');
    await breakExecution();
    const missing = await accountsLib.inventory.findMissingTx({ 
      finalaccts, today,
    });
    runInAction(() => state.inventory.missing = missing);
    if (missing.length === 0) {
      activity('Checking for livestock FIFO changes...');
      await breakExecution();
      // This only finds one livestock account for now...
      const livestock = finalaccts.originals.find(acct => acct.settings.inventorytype === 'livestock');
      accountsLib.ledger.assertLivestockInventoryAccount(livestock)
      const changes = accountsLib.inventory.livestock.computeLivestockFifoChangesNeeded(livestock);
      runInAction(() => state.inventory.changes = changes);
    }
    activity('Finished running inventory');
    await breakExecution();
    runInAction(() => state.inventory.state = 'done');
  } catch(e: any) {
    const msg = 'Failed to run inventory: '+e.toString();
    activity(msg, 'bad');
    errors([msg]);
    info('ERROR: failed to run inventory. Error =',e);
    runInAction(() => state.inventory.state = 'error');
    runInAction(() => state.inventory.errors = [ 'Failed to run inventory.  Check activity tab for errors.' ]);
  }
});

export const inventoryToday = action('inventoryToday', async (date: string) => {
  state.inventory.today = date;
});

export const inventoryInsertAllMissingLines = action('inventoryInsertAllMissingLines', async () => {
  try {
    if (!state.inventory.missing || state.inventory.missing.length < 1) {
      info('WARNING: tried to inventoryInsertAllMissingLines but there is nothing missing in the state.');
      return;
    }
    runInAction(() => state.inventory.state = 'running');
    for (const m of state.inventory.missing) {
      activity('Inserting missing lines for account '+m.acct.name);
      await breakExecution();
      await accountsLib.google.insertMissingIvtyTx(m);
    }
    activity('Reloading all changed accounts...');
    await breakExecution();
    // First, wait 1 second to give google time to apply the changes
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newledger = await accountsLib.google.reloadSomeAccountsFromGoogle({
      status: activity,
      accts: state.inventory.missing.map(m => m.acct),
      finalaccts: ledger()!.final!
    });
    stepResult({ ..._stepResult!, final: newledger });
    activity('Re-running inventory with reloaded accounts');
    await breakExecution();
    await runInventory();
    activity('Done inserting lines');
    await breakExecution();
  } catch(e: any) {
    const msg = 'Failed to insert lines in inventory: '+e.toString();
    activity(msg, 'bad');
    errors([msg]);
    info('ERROR: failed to insert lines in inventory. Error =',e);
    runInAction(() => state.inventory.state = 'error');
    runInAction(() => state.inventory.errors = [ 'Failed to insert lines.  Check activity tab for errors' ]);
  }
});

export const inventoryApplyAllChanges = action('inventoryApplyAllChanges', async (livestock: accountsLib.ledger.LivestockInventoryAccount) => {
  try {
    if (!state.inventory.changes || state.inventory.changes.length < 1) {
      info('WARNING: tried to inventoryApplyAllChanges but there are no changes to apply');
      return;
    }
    activity('Applying changes to livestock account...');
    await breakExecution();
    await accountsLib.google.applyLivestockFifoUpdates({ acct: livestock, lines: state.inventory.changes });
    // First, wait 2 seconds to give google time to apply the changes
    activity('Waiting 5 seconds on Google to update their cached copy');
    await new Promise(resolve => setTimeout(resolve, 5000));
    activity('Reloading livestock account...');
    await breakExecution();
    const newledger = await accountsLib.google.reloadSomeAccountsFromGoogle({
      status: activity,
      accts: [ livestock ],
      finalaccts: ledger()!.final!
    });
    stepResult({ ..._stepResult!, final: newledger });
    activity('Re-running inventory on reloaded accounts...');
    await breakExecution();
    await runInventory();
    activity('Done applying changes');
  } catch(e: any) {
    const msg = 'Failed to update inventory with FIFO changes: '+e.toString();
    activity(msg, 'bad');
    errors([msg]);
    info('ERROR: failed to update lines in inventory with FIFO changes. Error =',e);
    runInAction(() => state.inventory.state = 'error');
    runInAction(() => state.inventory.errors = [ 'Failed to update lines.  Check activity tab for errors' ]);
  }

});
