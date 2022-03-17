import moment, { Moment } from 'moment';
import chalk from 'chalk';
import { MultiError, LineError, AccountError } from '../err.js';
import { stringify } from '../stringify.js';

const { magenta } = chalk;
const { isMoment } = moment;

export type StatusFunction = (msg: string) => any;
// This is what "reader"-style things should return to be passed to this module:
export type RawSheetAccount = {
  filename: string,
  name: string,
  lines: any[],
  [key: string]: any,
};
export type ValidatedRawTx = {
  lineno: number,
  acct: { 
    name: string, 
    filename: string,
    [key: string]: any,
  } | AccountInfo,
  date?: Moment | string | null,
  description?: string | 'SPLIT',
  amount?: number,
  splitamount?: number,
  balance?: number,
  category?: string,
  note?: string | boolean | number | any[] | { [key: string]: any },
  writtenDate?: Moment | string | null,
  postDate?: Moment | string | null,
  transferacct?: string, // on futures accounts only, this is the account name to use for cash transfers in/out
  isStart?: boolean, 
  stmtacct?: string, // original "account" string from sheet (for futures w/ multiple statement origins)
  stmtlineno?: number, // on futures accounts, this is the lineno from the original statement
  errors?: string[],
  [key: string]: any, // handles things like asset account priorValue, expectedCurrentValue, etc.
};
export function assertValidatedRawTx(t: any): asserts t is ValidatedRawTx {
  if (!t) throw new MultiError({ msg: `Line cannot be null` });
  const errs: string[] = [];
  if (typeof t.lineno !== 'number') errs.push(`Tx has no line number (${t.lineno})`);
  if (t.date && typeof t.date !== 'string' && !isMoment(t.date)) errs.push(`date (${t.date}) is not a string or Moment`);
  if (t.description && typeof t.description !== 'string') errs.push(`description (${t.description}) is not a string`);
  if (t.amount && typeof t.amount !== 'number') errs.push(`amount (${t.amount}) is not a number`);
  if (t.splitamount && typeof t.splitamount !== 'number') errs.push(`splitamount (${t.splitamount})is not a number`);
  if (t.balance && typeof t.balance !== 'number') errs.push(`balance (${t.balance}) is not a number`);
  if (t.category && typeof t.category !== 'string') errs.push(`category (${t.category}) is not a string`);
  if (t.note && typeof t.note !== 'number' && typeof t.note !== 'string' && typeof t.note !== 'object' && typeof t.note !== 'boolean') {
    errs.push(`note (${t.note}) is not a string, number, array, boolean, or object`);
  }
  if (t.writtenDate && typeof t.writtenDate !== 'string' && !isMoment(t.writtenDate)) errs.push(`writtenDate (${t.writtenDate}) is not a string or Moment`);
  if (t.postDate && typeof t.postDate !== 'string' && !isMoment(t.postDate)) errs.push(`postDate (${t.postDate}) is not a string or Moment`);
  if (t.transferacct && typeof t.transferacct !== 'string') errs.push(`transferacct (${t.transferacct}) is not a string`);
  if ('isStart' in t && typeof t.isStart !== 'boolean') errs.push(`isStart (${t.isStart}) exists, but is not boolean`);
  if (t.acct) {
    try { assertAccountInfo(t.acct) }
    catch(e: any) {
      // Check if we at least have name, filename:
      if (typeof t.acct.name !== 'string') errs.push(`acct does not have a name (${t.acct.name}) on this tx`);
      if (typeof t.acct.filename !== 'string') errs.push(`acct does not have a filename (${t.acct.filename}) on this tx`);
    }
  }
  if (t.stmtacct && typeof t.stmtacct !== 'string') errs.push(`stmtacct (${t.stmtacct}) is not a string`);
  if (t.stmtlineno && typeof t.stmtlineno !== 'number') errs.push(`stmtlineno (${t.stmtlineno}) is not a number`);
  if (t.errors && (!Array.isArray(t.errors) || t.errors.find((e: any) => typeof e !== 'string'))) {
    errs.push('errors exists, but it is not an array of strings');
  }
  if (errs.length > 0) throw new LineError({ line: t, msg: errs });
};
export type ValidatedRawSheetAccount = {
  name: string,
  filename: string,
  lines: ValidatedRawTx[],
  settings: AccountSettings,
  origin?: OriginAccount,
  errors?: string[],
};

export type AccountSettings = {
  // accounttype is required, defaults to cash
  accounttype: 'inventory' | 'asset' | 'futures-asset' | 'futures-cash' | 'cash' | 'invalid',
  acctname?: string,
  balancetype?: 'inverted',
  amounttype?: 'inverted',
  mktonly?: boolean,
  taxonly?: boolean,

  // Asset account settings:
  asOfDate?: string,
  priorDate?: string,
  idcolumn?: string,

  // Allow other things in the spreadsheet, but we'll warn on them
  [key: string]: any,
}
export function assertAccountSettings(o: any): asserts o is AccountSettings {
  const errs: string[] = [];
  if (!o) {
    errs.push('Settings is null');
  } else if (!o.accounttype || typeof o.accounttype !== 'string') {
    errs.push(`Settings (${stringify(o)}) has no accounttype`);
  } else {
    if (o.acctname && typeof o.acctname !== 'string') {
      errs.push('Settings has acctname ('+magenta(o.acctname)+'), but it is not a string');
    }
    if (o.balancetype && o.balancetype !== 'inverted') {
      errs.push('Settings has a balancetype ('+magenta(o.balancetype)+'), but it is not "inverted"');
    }
    if (o.amounttype && o.amounttype !== 'inverted') {
      errs.push('Settings has a amounttype ('+magenta(o.amounttype)+'), but it is not "inverted"');
    }
    if (o.mktonly && typeof o.mktonly !== 'boolean') {
      errs.push('Settings has a mktonly ('+magenta(o.mktonly)+'), but it is not boolean');
    }
    if (o.taxonly && typeof o.taxonly !== 'boolean') {
      errs.push('Settings has a taxonly ('+magenta(o.taxonly)+'), but it is not boolean');
    }
    switch(o.accounttype) {
      case 'inventory':
      case 'asset':
      case 'futures-asset':
      case 'futures-cash':
      case 'cash': 
      break;
      case 'invalid': 
        errs.push('Settings has an accounttype of "invalid"');
      break;
      default: 
        errs.push('Settings has an accounttype ('+magenta(o.accounttype)+'), but it is not one of the known values of cash, inventory, asset, futures-asset, futures-cash');
    }
  }
  if (errs.length > 0) throw new MultiError({ msg: errs });
}


// AccountInfo is the info about the account w/o the actual account lines
export type AccountInfo = {
  name: string,
  filename: string,
  settings: AccountSettings,
  origin?: Omit<OriginAccount, 'lines'>,
  //[key: string]: any,      // can have any others
};
export function assertAccountInfo(a: any): asserts a is AccountInfo {
  const errs: string[] = [];
  if (!a) throw `AccountInfo cannot be null`;
  if (!a.name || typeof a.name !== 'string') errs.push(`AccountInfo has no name`);
  if (!a.filename || typeof a.filename !== 'string') errs.push(`AccountInfo has no filename`);
  if ('settings' in a) {
    try { 
      assertAccountSettings(a.settings) 
    } catch(e: any) {
      e = MultiError.wrap(e, `Settings (${stringify(a.settings)}) is not a valid AccountSettings`);
      errs.push(...e.msgs());
    }
  }
  if ('lines' in a) errs.push('AccountInfo cannot have lines');
  if (a.origin && 'lines' in a.origin) errs.push('AccountInfo cannot have origin.lines');
  if (errs.length > 0) throw new MultiError({ msg: errs });
}

export type AccountTx = {
  date: Moment,
  description: string | 'SPLIT',
  amount: number,
  splitamount?: number,
  balance: number,
  category: string,
  note?: string | number | boolean | any[] | { [key: string]: any },
  writtenDate?: Moment,
  postDate?: Moment,
  is_error?: false,
  isStart?: boolean,
  acct: AccountInfo, // all the info about the account for this line, minus the lines
  stmtacct?: string, // original "account" string from sheet (for futures w/ multiple statement origins)
  lineno: number,
  stmtlineno?: number, // on futures accounts, this is the lineno from the original statement
  [key: string]: any,
};
export function assertAccountTx(l: any): asserts l is AccountTx {
  const errs: string[] = [];
  if (!l) throw new MultiError({ msg: [ `Line must be truthy` ]});
  try { 
    assertAccountInfo(l.acct) 
  } catch(e: any) {
    e = LineError.wrap(e, l, `line.acct is not a valid AccountInfo`);
    errs.push(...e.msgs());
  }
  if (!l.date) errs.push(`Line has no date`);
  else if (!isMoment(l.date)) errs.push(`date (${l.date}) is not a Moment, which means it was not readable as YYYY-MM-DD format`);
  else if (!l.date.isValid()) errs.push(`date (${l.date}) is not valid, which means it was of the format YYYY-MM-DD like 2021-01-01`);
  if (typeof l.description !== 'string') errs.push(`description (${l.description}) is not a string`);
  if (typeof l.amount !== 'number') errs.push(`amount (${l.amount}) is not a number`);
  if ('splitamount' in l && typeof l.splitamount !== 'number') errs.push(`splitamount (${l.splitamount}) is not a number`);
  if (typeof l.balance !== 'number') errs.push(`balance (${l.balance}) is not a number`);
  if (!l.category || l.category == '' || typeof l.category !== 'string') errs.push(`category (${l.category}) is empty or not a string`);
  if ('note' in l && typeof l.note !== 'string' && typeof l.note !== 'number' && typeof l.note !== 'object' && typeof l.note !== 'boolean') errs.push(`note (${l.note}) is not a string, number, object, array, or boolean`);
  if ('writtenDate' in l && (!l.writtenDate || !isMoment(l.writtenDate))) errs.push(`writtenDate (${l.writtenDate}) is not a Moment`);
  if ('postDate' in l && (!l.postDate || !isMoment(l.postDate))) errs.push(`postDate (${l.postDate}) is not a Moment`);
  if ('is_error' in l && l.is_error !== false) errs.push(`is_error exists, but it is not false`);
  if ('isStart' in l && typeof l.isStart !== 'boolean') errs.push(`isStart exists, but it is not boolean, it is ${typeof l.isStart} instead`);
  if ('stmtacct' in l && typeof l.stmtacct !== 'string') errs.push(`stmtacct (${l.stmtacct}) is not a string`);
  if (typeof l.lineno !== 'number') errs.push(`lineno (${l.lineno}) is not a number`);
  if (l.stmtlineno && typeof l.stmtlineno !== 'number') errs.push(`stmtlineno (${l.stmtlineno}) is not a number`);
  if (errs.length > 0) throw new LineError({ msg: errs, line: l });
}

export type OriginLine = {
  date: Moment,
  lineno: number,
  acct: {
    name: string,
    filename: string,
  },
  [key: string]: any
};
export function assertOriginLine(o: any): asserts o is OriginLine {
  if (!o) throw new MultiError({ msg: `OriginLine cannot be null` });
  const errs: string[] = [];
  if (!o.date || !isMoment(o.date)) errs.push(`OriginLine date is not a moment`);
  if (typeof o.lineno !== 'number') errs.push(`OriginLine has no lineno`);
  if (!o.acct || typeof o.acct.name !== 'string' || typeof o.acct.filename !== 'string') {
    errs.push(`OriginLine acct (${o.acct})is missing or does not have name and filename`);
  }
  if (errs.length > 0) throw new MultiError({ msg: errs });
};
export type OriginAccount = {
  name: string,
  filename: string,
  lines: OriginLine[],
};
export function assertOriginAccount(o: any): asserts o is OriginAccount {
  if (!o) throw new MultiError({ msg: `OriginAccount cannot be null` });
  const errs: string[] = [];
  if (typeof o.name !== 'string') errs.push(`OriginAccount has no name`);
  if (typeof o.filename !== 'string') errs.push(`OriginAccount has no filename`);
  if (!o.lines) {
    errs.push('OriginAccount has no lines');
  } else {
    for (const line of o.lines) {
      try { assertOriginLine(line) }
      catch(e: any) {
        e = MultiError.wrap(e, `OriginLine failed validation`);
        errs.push(...e.msgs());
      }
    }
  }
  if (errs.length > 0) throw new MultiError({ msg: errs });
}

export type Account = {
  name: string,
  filename: string,
  settings: AccountSettings;
  lines: AccountTx[];
  origin?: OriginAccount;
};
export function assertAccount(a: any): asserts a is Account {
  if (!a) throw new MultiError({ msg: `Account cannot be null` });
  const errs: string[] = [];
  if (!a.name || typeof a.name !== 'string') errs.push(`Account has no name`);
  if (!a.filename || typeof a.filename !== 'string') errs.push(`Account has no filename`);
  try { assertAccountSettings(a.settings) }
  catch(e: any) { 
    e = AccountError.wrap(e, a, `Account settings are invalid`);
    errs.push(...e.msgs());
  }
  if (!a.lines) {
    errs.push(`Account has no lines`);
  } else {
    for (const line of a.lines) {
      try { assertAccountTx(line)}
      catch(e: any) {
        e = LineError.wrap(e, line, `Line failed AccountTx validation`);
        errs.push(...e.msgs());
      }
    }
  }
  if ('origin' in a) {
    try { assertOriginAccount(a.origin) }
    catch(e: any) {
      e = AccountError.wrap(e, a, `Account has origin, but origin does not pass validation`);
      errs.push(...e.msgs());
    }
  }
  if (errs.length > 0) {
    throw new MultiError({ msg: errs });
  }
}

// When you combine accounts into a single ledger, CompositeAccount is what you get
export type CompositeAccount = {
  lines: AccountTx[],
  accts: Account[],
};
export function assertCompositeAccount(c: any): asserts c is CompositeAccount {
  if (!c) throw new MultiError({ msg: 'CompositeAccount must not be null' });
  if (!Array.isArray(c.lines)) throw new MultiError({ msg: `Lines must be an array` });
  if (!Array.isArray(c.accts)) throw new MultiError({ msg: `Accts must be an array` });
  let l;
  try { 
    for (l of c.lines) assertAccountTx(l);
  } catch(e: any) {
    throw LineError.wrap(e, l, `Line was not a valid account transaction`);
  }
  try {
    for (const a of c.accts) assertAccount(a);
  } catch(e: any) {
    throw MultiError.wrap(e, `Account was not a valid account`);
  }
}

// FinalAccounts are aggregated into tax,mkt and there are no errors
export type FinalAccounts = {
  tax: CompositeAccount,
  mkt: CompositeAccount,
};
export function assertFinalAccounts(a: any): asserts a is FinalAccounts {
  if (!a) throw new MultiError({ msg: `FinalAccounts cannot be null` });
  if (typeof a !== 'object') throw new MultiError({ msg: `FinalAccounts is not an object` });
  for (const type of [ 'tax', 'mkt' ]) {
    try {
      assertCompositeAccount(a[type]);
    } catch(e) {
      throw MultiError.wrap(e, `${type} account was not valid`);
    }
  }
}


