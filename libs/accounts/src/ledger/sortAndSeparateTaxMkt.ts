import type { Account, AccountTx, FinalAccounts, StatusFunction } from './types.js';
import moment from 'moment';
import { LineError } from '../err.js';
import debug from 'debug';
import rfdc from 'rfdc';
import { breakExecution } from './util.js';


const deepclone = rfdc({ proto: true });
const info = debug('af/accounts#sortAndSeparateTaxMkt:info');
//const trace = debug('af/accounts#sortAndSeparateTaxMkt:trace');

// We have asset/inventory accounts and cash accounts.  
// Let's return (tax, mkt) tx lines (for P&L) and balances (for balance sheets)

function convertStartingBalancesToTxAmounts(lines: AccountTx[]) {
  for (const l of lines) {
    // asset accounts already have a $0 starting balance w/ net changes in amounts.  
    // "+=" preserves the amounts.  I originally just did amount = balance, and that lost
    // all the asset starting amounts.
    if (l.isStart) {
      l.amount += l.balance;
      // For inventory accounts:
      if ('qty' in l && 'qtyBalance' in l) {
        l.qty += l.qtyBalance;
      }
      // For livestock inventory accounts:
      if ('taxAmount' in l && 'taxBalance' in l) {
        l.taxAmount += l.taxBalance;
      }
      if ('weight' in l && 'weightBalance' in l) {
        l.weight += l.weightBalance;
      }
    }
  };
  // Decided to leave all start lines, but turn them into amounts so balance is right.
  // HOWEVER, when computing a P&L, you HAVE to remember to NOT include isStart lines!!
  // Make a new start w/ zero balance 1 day before current oldest:
  const newstart: AccountTx = {
    date: lines[0]?.date.subtract(1, 'day') || moment('1970-01-01', 'YYYY-MM-DD'),
    description: 'Synthetic start for aggregate account',
    amount: 0,
    balance: 0,
    category: 'START',
    isStart: true,
    lineno: -1,
    acct: lines[0]!.acct,
  };
  // need these for inventory accounts:
  if (lines[0] && 'qty' in lines[0]) newstart.qty = 0;
  if (lines[0] && 'qtyBalance' in lines[0]) newstart.qtyBalance = 0;
  // also need these for livestock inventory accounts
  if (lines[0] && 'taxAmount' in lines[0]) newstart.taxAmount = 0;
  if (lines[0] && 'taxBalance' in lines[0]) newstart.taxBalance = 0;
  if (lines[0] && 'weight' in lines[0]) newstart.weight = 0;
  if (lines[0] && 'weightBalance' in lines[0]) newstart.weightBalance = 0;

  return [ newstart, ...lines ];
}

function sortLinesByDate(lines: AccountTx[]) {
  // Sort by date
  lines.sort((a,b) => {
    if (!a.date || typeof a.date.diff !== 'function') {
      throw new LineError({ line: a, msg: `When sorting lines, line had an empty or invalid date` });
    }
    return a.date.diff(b.date);
  });
}

export function recomputeBalances(lines: AccountTx[]) {
  for (let i=0; i < lines.length; i++) {
    let prev = i===0 ? 0 : lines[i-1]?.balance || 0;
    if (Math.abs(prev) < 0.01) prev = 0;
    if (Math.abs(lines[i]!.amount) < 0.01) lines[i]!.amount = 0;
    lines[i]!.balance = prev + lines[i]!.amount;

    if (lines[i]!.acct.settings.accounttype === 'inventory') {
      prev = i===0 ? 0 : lines[i-1]?.qtyBalance || 0;
      if (Math.abs(prev) < 0.01) prev = 0;
      if (Math.abs(lines[i]!.qty) < 0.01) lines[i]!.qty= 0;
      lines[i]!.qtyBalance = prev + lines[i]!.qty;
      
      if (lines[i]!.acct.settings.inventorytype === 'livestock') {
        prev = i===0 ? 0 : lines[i-1]?.weightBalance || 0;
        if (Math.abs(prev) < 0.01) prev = 0;
        if (Math.abs(lines[i]!.weight) < 0.01) lines[i]!.weight = 0;
        lines[i]!.weightBalance = prev + lines[i]!.weight;
      }
    }
  };
}

function combineAndSortLines(accts: Account[], status: StatusFunction) {

  const lines: AccountTx[] = [];
  for (const acct of accts) {
    for (const l of acct.lines) {
      lines.push({ ...l }); // shallow copy of l so we can recompute balances later
    }
  }
  sortLinesByDate(lines);
  recomputeBalances(lines);
  return lines;
}


export default async function(
  { accts, status }
: { accts: Account[], status?: StatusFunction }
): Promise<FinalAccounts> {
  if (!status) status = info;
  const originals = accts;
  accts = deepclone(accts); // we will mutate the lines, so clone first

  // First, walk all accounts and get them sorted correctly by date with their balances recomputed accordingly
  status('Sorting all lines by date and recomputing balances accordingly');
  for (const a of accts) {
    if (a.lines.length < 1) continue; // no lines to worry about
    a.lines = convertStartingBalancesToTxAmounts(a.lines);
    sortLinesByDate(a.lines);
    recomputeBalances(a.lines);
  }

  status('Lines sorted, now splitting tax/mkt');
  await breakExecution();
  // Now split up tax/mkt into separate sets:
  // All asset type accounts have taxonly or mktonly set on them by the synthetic account creation in assetsToTxAccts.
  // Cash and inventory accounts go in both tax and mkt unless they specify specifically taxonly/mktonly
  let taxaccts = accts.filter(a => 
    a.settings.taxonly || 
    (!a.settings.mktonly && 
       (   a.settings.accounttype === 'cash' 
        || a.settings.accounttype === 'futures-cash' 
        || a.settings.accounttype === 'inventory'
       )
    )
  );
  const mktaccts = accts.filter(a => 
    a.settings.mktonly || 
    (!a.settings.taxonly && 
       (   a.settings.accounttype === 'cash' 
        || a.settings.accounttype === 'futures-cash' 
        || a.settings.accounttype === 'inventory'
       )
    )
  );

  status('Tax/Mkt split, now swapping in taxAmount to amount for tax account version');
  await breakExecution();
  // The livestock inventory accounts have taxAmount and taxBalance that need to be 
  // swapped into the amount and balance spots in the tax version of the account.
  for (const [index, acct] of taxaccts.entries()) {
    if (acct.settings.accounttype !== 'inventory') continue;
    if (acct.settings.inventorytype !== 'livestock') continue;
    taxaccts[index] = { 
      ...acct, // shallow clone, map the lines: this is because the tax/mkt version of this account is actually different, so we need 2 copies of actual lines
      lines: acct.lines.map(tx => ({
        ...tx,
        mktAmount: tx.amount,
        mktBalance: tx.balance,
        amount: tx.taxAmount,
        balance: tx.taxBalance,
      }))
    }
  }

  status('running combineAndSortLines for taxaccts');
  breakExecution();
  const taxlines = combineAndSortLines(taxaccts, status);
  status('running combineAndSortLines for mktaccts');
  breakExecution();
  const mktlines = combineAndSortLines(mktaccts, status);

  status('Returning tax and mkt accounts');


  return {
    tax: {
      lines: taxlines,
      accts: taxaccts,
    },
    mkt: {
      lines: mktlines,
      accts: mktaccts,
    },
    originals,
  };

}
