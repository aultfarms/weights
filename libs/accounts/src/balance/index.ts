import moment, { type Moment } from 'moment';
import type { AccountTx, Account, FinalAccounts } from '../ledger/index.js';
import debug from 'debug';
//import numeral from 'numeral';
//import clitable from 'cli-table';
import { MultiError } from '../err.js';
import { isSameDayOrBefore } from '../util.js';

// to simplify tests
export { moneyEquals } from '../ledger/util.js';

//const info = debug('af/accounts#balance:info');
const warn = debug('af/accounts#balance:warn');

export { annualBalanceSheetToWorkbook } from './exporter.js';

export type BalanceTree = {
  name: string,
  balance: number,
  children: { [key: string]: BalanceTree },
  acct?: Account,
};

export type BalanceSheet = {
  name: string,
  type: 'mkt' | 'tax',
  date: Moment,
  tree: BalanceTree,
};

export type AnnualBalanceSheet = {
  type: 'mkt' | 'tax',
  year: number,
  yearend?: BalanceSheet,
  asOfDate?: BalanceSheet,
  quarters?: BalanceSheet[],
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
  { balanceSheet, accountName, balanceTree }:
  { balanceSheet: BalanceSheet, accountName: string, balanceTree?: BalanceTree }
): number {
  const parts = accountName.split('-');
  if (parts.length < 1) throw new MultiError({ msg: 'accountName was empty' });
  let cur = balanceSheet.tree; // start at 'root'
  if (accountName === 'root') return cur.balance;

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
  return cur.balance;
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

export function balanceForAccountOnDate(d: Moment, acct: { lines: AccountTx[] }): number {
  if (acct.lines.length < 1) {
    warn('balanceForAccountOnDate: account has no lines, returning 0');
    return 0;
  }
  // Walk account until the next day is past the day we want:
  let prev = null;
  for (const l of acct.lines) {
    // First line date not before or on same day as our search date
    if (!isSameDayOrBefore(l.date, d)) { //l.date.isSameOrBefore(d)) {
      if (!prev) return 0; // first line in account that is not same/before search date
      return prev.balance;
    }
    prev = l;
  }
  // If we get here, we have a date AFTER the last entry, so balance is just the last entry
  return acct.lines[acct.lines.length-1]!.balance;
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
  // If I have an associated account (they live in the leaves generally)
  // add the balance of that original account too:
  if (tree.acct) {
    tree.balance += balanceForAccountOnDate(asOfDate, tree.acct);
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
      if (!cur.children[p]) cur.children[p] = { name: p, balance: 0, children: {} };
      cur = cur.children[p]!;
    }
    cur.acct = acct; // put the account at the bottom of the tree
    return acc;
  }, { name: 'root', balance: 0, children: {} });
  // Now that tree is built, go add up all the balances from the accounts and their children
  updateBalancesFromChildren(tree, asOfDate);
  return tree;
}


export async function annualBalanceSheet(
  { year, date, type, ledger }:
  { year: number,  date?: Moment | string, type: 'mkt' | 'tax', ledger: FinalAccounts },
): Promise<AnnualBalanceSheet> {
  if (typeof date === 'string') {
    date = moment(date, 'YYYY-MM-DD');
  }
  let dates: { date: string, name: string, isAsOf?: true, isYearEnd?: true, isQuarter?: true }[] = [];
  if (!year && !date) {
    dates.push({ date: moment().format('YYYY-MM-DD'), name: 'As of Now', isAsOf: true });
    year = moment().year();
  }
  if (date) {
    dates.push({ date: date.format('YYYY-MM-DD'), name: `As Of ${date}`, isAsOf: true });
    if (!year) year = date.year();
  }
  if (year) {
    dates.push(
      { date: `${year}-12-31`, name: `${year}Q4`, isQuarter: true, isYearEnd: true },
      { date: `${year}-09-30`, name: `${year}Q3`, isQuarter: true },
      { date: `${year}-06-30`, name: `${year}Q2`, isQuarter: true },
      { date: `${year}-03-31`, name: `${year}Q1`, isQuarter: true },
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
      acc.quarters.push(b);
    }
    if (d.isAsOf) {
      acc.asOfDate = b;
    }
    return acc;
  }, { type, year } as AnnualBalanceSheet);
};
