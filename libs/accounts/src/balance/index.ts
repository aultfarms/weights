import moment, { type Moment } from 'moment';
import type { AccountTx, Account, FinalAccounts } from '../ledger/index.js';
import debug from 'debug';
//import numeral from 'numeral';
//import clitable from 'cli-table';
import { MultiError } from '../err.js';
import { isSameDayOrBefore } from '../util.js';

// to simplify tests
export { moneyEquals } from '../ledger/util.js';

const info = debug('af/accounts#balance:info');
const warn = debug('af/accounts#balance:warn');

export { annualBalanceSheetToWorkbook, borrowingBaseToWorkbook } from './exporter.js';

export type BalanceTree = {
  name: string,
  balance: number,
  qtyBalance: number,
  weightBalance: number,
  children: { [key: string]: BalanceTree },
  acct?: Account,
};

export type BalanceSheet = {
  name: string,
  type: 'mkt' | 'tax',
  date: Moment,
  tree: BalanceTree,
};

export type QuarterBalanceSheet = {
  name: string,
  year: number,
  quarter: number,
  balancesheet: BalanceSheet,
}

export type AnnualBalanceSheet = {
  type: 'mkt' | 'tax',
  year: number,
  yearend?: BalanceSheet,
  asOfDate?: BalanceSheet,
  quarters?: QuarterBalanceSheet[],
}

export type CatIndex = {
  [cat: string]: true
};

export function treeToCategoryNames(
  tree: BalanceTree, 
  catindex: CatIndex, // mutates catindex
  opts: { excludeRoot?: boolean },
  parentstr?: string,
): void {
  if (typeof parentstr !== 'string') {
    parentstr = '';
  }
  if (tree.name !== 'root' || !opts.excludeRoot) {
    if (parentstr) parentstr += '-';
    parentstr += tree.name;
    catindex[parentstr] = true;
  }
  if (tree.children) {
    for (const c of Object.values(tree.children)) {
      treeToCategoryNames(c, catindex, opts, parentstr);
    }
  }
};

export function getAccountBalance(
  { balanceSheet, accountName, useQty, useWeight }:
  { balanceSheet: BalanceSheet, accountName: string, useQty?: true, useWeight?: true }
): number {
  const parts = accountName.split('-');
  if (parts.length < 1) throw new MultiError({ msg: 'accountName was empty' });
  let cur = balanceSheet.tree; // start at 'root'
  if (accountName === 'root') {
    return !useQty ? !useWeight ? cur.balance : (cur.weightBalance || 0) : (cur.qtyBalance || 0);
  }

  for (let [index, part] of parts.entries()) {
    if (!cur.children[part]) {
      if (index === 0) { // if the first part, try prefixing with tax. or mkt.
        const origpart = part;
        part = `${balanceSheet.type}.${part}`;
        if (!cur.children[part]) {
          throw new MultiError({msg: `Account Name ${accountName} does not exist in Balance Sheet, failed at part ${origpart}. Also tried ${part}.  cur.children names are: ${Object.keys(cur.children).join(', ')}` });
        }
      } else {
        throw new MultiError({msg: `Account Name ${accountName} does not exist in Balance Sheet, failed at part ${part}. cur.children names are: ${Object.keys(cur.children)}` });
      }
    }
    cur = cur.children[part]!;
  }
  return !useQty ? !useWeight ? cur.balance : (cur.weightBalance || 0) : (cur.qtyBalance || 0);
}

/*
function printTxTable(lines: AccountTx[]) {
  const table = new clitable({ head: [ 'date', 'amount', 'balance', 'description', 'who', 'category' ] });
  for (const l of lines) {
    table.push([ 
      l.date.format('YYYY-MM-DD'), 
      numeral(l.amount).format('$0,0.00'),
      numeral(l.balance).format('$0,0.00'),
      l.description || '',
      l.who || '',
      l.category || '',
    ]);
  }
  info(table.toString());
};
*/

export function balanceForAccountOnDate({ date, acct, useQty, useWeight }: { date: Moment, acct: { lines: AccountTx[] }, useQty?: true, useWeight?: true }): number {
  if (acct.lines.length < 1) {
    warn('balanceForAccountOnDate: account has no lines, returning 0');
    return 0;
  }
  // Walk account until the next day is past the day we want:
  let prev = null;
  for (const l of acct.lines) {
    // First line date not before or on same day as our search date
    if (!isSameDayOrBefore(l.date, date)) { //l.date.isSameOrBefore(d)) {
      if (!prev) return 0; // first line in account that is not same/before search date
      return !useQty ? !useWeight ? prev.balance : (prev.weightBalance || 0) : (prev.qtyBalance || 0);
    }
    prev = l;
  }
  // If we get here, we have a date AFTER the last entry, so balance is just the last entry
  const lastline = acct.lines[acct.lines.length-1]!;
  return !useQty ? !useWeight ? lastline.balance : (lastline.weightBalance || 0) : (lastline.qtyBalance || 0);
}

function updateBalancesFromChildren(tree: BalanceTree, asOfDate: Moment): void {
  // First, make sure child balances are correct:
  if (tree.children) {
    for (const child of Object.values(tree.children)) {
      updateBalancesFromChildren(child, asOfDate);
    }
  }
  // Next, add my current balance to the balance of all my children
  tree.balance += Object.values(tree.children).reduce((sum,child) => (sum+child.balance), 0);
  tree.qtyBalance += Object.values(tree.children).reduce((sum,child) => (sum+child.qtyBalance), 0);
  tree.weightBalance += Object.values(tree.children).reduce((sum,child) => (sum+child.weightBalance), 0);
  // If I have an associated account (they live in the leaves generally)
  // add the balance of that original account too:
  if (tree.acct) {
    tree.balance += balanceForAccountOnDate({ date: asOfDate, acct: tree.acct });
    tree.qtyBalance += balanceForAccountOnDate({ date: asOfDate, acct: tree.acct, useQty: true });
    tree.weightBalance += balanceForAccountOnDate({ date: asOfDate, acct: tree.acct, useWeight: true });
  }
}

// accts is an array, reduce it into a tree
function balanceTreeFromAcctsOnDate(accts: Account[], asOfDate: Moment): BalanceTree {
  const tree = accts.reduce((acc: BalanceTree,acct) => {
    // accts.acct, accts.balance, accts.date
    const parts = acct.name.split('-');
    if (parts.length < 1) {
      throw new MultiError({ msg: `Account name ${acct.name} was empty!` });
    }
    let cur = acc;
    for(const p of parts) {
      // Find our place in the tree, creating paths as we go if necessary
      if (!cur.children) cur.children = {};
      if (!cur.children[p]) {
        cur.children[p] = { name: p, balance: 0, qtyBalance: 0, weightBalance: 0, children: {} };
      }
      cur = cur.children[p]!;
    }
    cur.acct = acct; // put the account at the bottom of the tree
    return acc;
  }, { name: 'root', balance: 0, qtyBalance: 0, weightBalance: 0, children: {} });
  // Now that tree is built, go add up all the balances from the accounts and their children
  updateBalancesFromChildren(tree, asOfDate);
  return tree;
}


export async function borrowingBase({ ledger }: { ledger: FinalAccounts }): Promise<QuarterBalanceSheet[]> {
  const filteredLedger: FinalAccounts = {
    ...ledger,
    mkt: {
      lines: ledger.mkt.lines,
      accts: ledger.mkt.accts.filter(a => !!a.settings.borrowingBase),
    },
  };
  const nowYear = moment().year();
  let allQuarters: QuarterBalanceSheet[] = [];
  for (let year = 2020; year <= nowYear; year++) {
    // This will return an entry for every quarter in bs.quarters
    const bs = await annualBalanceSheet({ year, type: 'mkt', ledger: filteredLedger });
    if (!bs.quarters) {
      throw new MultiError({ msg: 'ERROR: did not get back any quarters from annualBalanceSheet for year '+year });
    }
    allQuarters = [ ...allQuarters, ...(bs.quarters) ];
  }
  return allQuarters;
}

export async function annualBalanceSheet(
  { year, date, type, ledger }:
  { year: number,  date?: Moment | string, type: 'mkt' | 'tax', ledger: FinalAccounts },
): Promise<AnnualBalanceSheet> {
  if (typeof date === 'string') {
    date = moment(date, 'YYYY-MM-DD');
  }
  let dates: { date: string, name: string, year: number, isAsOf?: true, quarter?: number, isYearEnd?: true, isQuarter?: true }[] = [];
  if (!year && !date) {
    const now = moment();
    dates.push({ date: now.format('YYYY-MM-DD'), year: now.year(), name: 'As of Now', isAsOf: true });
    year = now.year();
  }
  if (date) {
    dates.push({ date: date.format('YYYY-MM-DD'), year: date.year(), name: `As Of ${date}`, isAsOf: true });
    if (!year) year = date.year();
  }
  if (year) {
    dates.push(
      { date: `${year}-12-31`, name: `${year}Q4`, year, quarter: 4, isQuarter: true, isYearEnd: true },
      { date: `${year}-09-30`, name: `${year}Q3`, year, quarter: 3, isQuarter: true },
      { date: `${year}-06-30`, name: `${year}Q2`, year, quarter: 2, isQuarter: true },
      { date: `${year}-03-31`, name: `${year}Q1`, year, quarter: 1, isQuarter: true },
    );
  }
 
  // Now construct the annual balance sheet: as-of, yearend, and quarters
  return dates.reduce((acc,d) => {
    const m = moment(d.date, 'YYYY-MM-DD');
    const b = { 
      type,
      date: m, 
      name: d.name, 
      tree: balanceTreeFromAcctsOnDate(ledger[type]!.accts,m) 
    };
    if (d.isYearEnd) {
      acc.yearend = b;
    }
    if (d.isQuarter) {
      if (!acc.quarters) acc.quarters = [];
      acc.quarters.push({
        year: d.year,
        name: d.name,
        quarter: d.quarter!,
        balancesheet: b,
      });
    }
    if (d.isAsOf) {
      acc.asOfDate = b;
    }
    return acc;
  }, { type, year } as AnnualBalanceSheet);
};
