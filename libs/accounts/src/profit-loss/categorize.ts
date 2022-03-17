import type { AccountTx } from '../ledger/types.js';
import { LineError } from '../err.js';
import type { Moment } from 'moment';
import type { DateRange }from 'moment-range';
import { stringify } from '../stringify.js';
import debug from 'debug';
const info = debug('af/accounts#profit-loss/categorize');

export type AmountConfig = {
  start?: Moment,
  end?: Moment,
  timerange?: DateRange,
  type?: 'debit' | 'credit',
  only?: string,
  exclude?: string,
};

export type CategoryTree = {
  name: string;
  parent?: CategoryTree | null;
  children: { [name: string]: CategoryTree };
  transactions: AccountTx[];
};

export function amount(cat: CategoryTree, cfg?: AmountConfig): number {
  cfg = cfg || {};
  const {start,end,timerange,type,only,exclude} = cfg;
  // if this one it explicitly excluded, no need to recurse
  if (exclude && cat.name === exclude) return 0;
  // if this one does not contain the only one we want, we're done
  if (only && !containsCategory(cat,only) && !underCategory(cat,only)) return 0;
  // total of transactions at this level plus amounts of children
  const mysum = cat.transactions.reduce((sum,tx) => {
    if (type === 'credit' && tx.amount < 0) return sum; // credits are positive
    if (type === 'debit'  && tx.amount > 0) return sum; // debits are negative
    if (start && tx.date.isBefore(start)) return sum; // before start time
    if (end   && tx.date.isAfter(end))    return sum; // after end time
    if (timerange && !timerange.contains(tx.date)) return sum; // does not fall within the time range
    return sum + tx.amount; // otherwise, include in resulting sum
  },0);

  const childrensum = Object.values(cat.children).reduce((sum,child) => {
    return sum + amount(child,cfg);
  },0);
  const ret = mysum + childrensum;
  if (Math.abs(ret) < 0.01) return 0; // If you don't do this, you get a NaN from numeral sometimes
  return ret;
}

export function debit(cat: CategoryTree, cfg?: AmountConfig): number {
  if (!cfg) cfg = {};
  return amount(cat, { ...cfg, type: 'debit' });
}
export function credit(cat: CategoryTree, cfg?: AmountConfig): number {
  if (!cfg) cfg = {};
  return amount(cat, { ...cfg, type: 'credit' });
}

export type CatIndex = {
  [cat: string]: true
};
export function treeToCategoryNames(
  tree: CategoryTree, 
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


export function getCategory(cat: CategoryTree, name: string): CategoryTree | null {
  if (!cat) return null;
  const parts = name.split('-');
  const thislevel = parts[0];
  if (!thislevel) return null;
  const child = cat.children[thislevel];
  if (!child) return null;
  if (parts.length === 1) return child;
  return getCategory(child, parts.slice(1).join('-'));
}

export function containsCategory(cat: CategoryTree | null, name: string): boolean {
  if (!cat) return false;
  if (cat.name === name) return true;
  if (!cat.children) return false;
  for (const child of Object.values(cat.children)) {
    if (containsCategory(child, name)) return true;
  }
  return false; // none of children had it either
}

export function underCategory(cat: CategoryTree, search_parent_name: string): boolean {
  if (!cat.parent) return false; // reached the top
  if (cat.parent.name === search_parent_name) return true;
  return underCategory(cat.parent,search_parent_name);
};


export function categorize({ lines }: { lines: AccountTx[] }): CategoryTree {
 
  const template = (name: string, parent?: CategoryTree): CategoryTree => { 
    return {
      name,
      parent: parent || null,
      children: {},
      transactions: [],
    };
  };

  const cats = template('root');

  const transactionToTree = (catarr:string[],tx:AccountTx,treelevel:CategoryTree): void => {
    const catkey = catarr[0];
    if (!catkey) {
      throw new LineError({ line: tx, msg: `First part of the split category array is empty (${catarr})` });
    }
    if (!treelevel.children[catkey]) treelevel.children[catkey] = template(catkey, treelevel);
    const catobj = treelevel.children[catkey]!;
    // If there are more, recurse again
    if (catarr.length > 1) {
      transactionToTree(catarr.slice(1), tx, catobj);
      return ;
    }
    // If that was the only item in the remaining cat array, this transaction
    // goes here in the tree and no need to recurse further
    catobj.transactions.push(tx);
  };

  const txCatToArr = (tx: AccountTx) => {
    if (!tx.category || typeof tx.category !== 'string') {
      throw new Error(`categorize: ERROR: found a tx without a valid category: ${stringify(tx)}`);
    }
    return tx.category.split('-');
  };

  for (const tx of lines) {
    if (!tx.category || typeof tx.category !== 'string') {
      throw new LineError({ line: tx, msg: `categorize: ERROR: found a tx without a valid category: (${tx.category})` });
    }
    // ensure a tree exists with this structure, and put the tx at the bottom of the tree
    transactionToTree(txCatToArr(tx),tx,cats);
  };


  return cats;
}
