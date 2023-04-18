import moment, { type Moment } from 'moment';
import chalk from 'chalk';
import { MultiError, LineError, AccountError } from '../err.js';
import { stringify } from '../stringify.js';
import debug from 'debug';

const trace = debug('af/accounts#types:trace');

const { magenta } = chalk;
const { isMoment } = moment;

export type StatusFunction = (msg: string) => any;
// This is what "reader"-style things should return to be passed to this module:
export type RawSheetAccount = {
  filename: string,
  name: string,
  id: string,
  header: string[],
  lines: any[],
  [key: string]: any,
};
export type ValidatedRawTx = {
  lineno: number,
  acct: { 
    name: string, 
    filename: string,
    id: string, // if it came from google, this is the file id.  If it came from node/xlsx, this is just the same as filename
    [key: string]: any,
  } | LineAccountInfo,
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

  // Inventory Accounts:
  qty?: number,
  qtyBalance?: number,
  aveValuePerQty?: number, // non-livestock inventories
  taxAmount?: number, // generally only livestock inventories
  taxBalance?: number, // generally only livestock inventories
  // Livestock inventory accounts:
  weight?: number,
  weightBalance?: number,
  aveValuePerWeight?: number,
  aveWeightPerQty?: number,

  // Everything else:
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
    try { assertLineAccountInfo(t.acct) }
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
  if (t.qty && typeof t.qty !== 'number') errs.push(`qty (${t.qty}) is not a number`);
  if (t.qtyBalance && typeof t.qtyBalance !== 'number') errs.push(`qtyBalance (${t.qtyBalance}) is not a number`);
  if (t.aveValuePerQty && typeof t.aveValuePerQty !== 'number') errs.push(`aveValuePerQty (${t.aveValuePerQty}) is not a number`);
  if (t.taxAmount && typeof t.taxAmount !== 'number') errs.push(`taxAmount (${t.taxAmount}) is not a number`);
  if (t.taxBalance && typeof t.taxBalance !== 'number') errs.push(`taxBalance (${t.taxBalance}) is not a number`);
  if (t.weight && typeof t.weight !== 'number') errs.push(`weight (${t.weight}) is not a number`);
  if (t.weightBalance && typeof t.weightBalance !== 'number') errs.push(`weightBalance (${t.weightBalance}) is not a number`);
  if (t.aveValuePerWeight && typeof t.aveValuePerWeight !== 'number') errs.push(`aveValuePerWeight (${t.aveValuePerWeight}) is not a number`);
  if (t.aveWeightPerQty && typeof t.aveWeightPerQty !== 'number') errs.push(`aveWeightPerQty (${t.aveWeightPerQty}) is not a number`);
  if (errs.length > 0) throw new LineError({ line: t, msg: errs });
};
export type ValidatedRawSheetAccount = {
  name: string,
  filename: string,
  id: string,
  lines: ValidatedRawTx[],
  settings: AccountSettings,
  header: string[],
  origin?: OriginAccount,
  errors?: string[],
};

export type AccountSettings = BaseAccountSettings | AssetAccountSettings | InventoryAccountSettings;

export type BaseAccountSettings = {
  // accounttype is required, defaults to cash
  accounttype: 'inventory' | 'asset' | 'futures-asset' | 'futures-cash' | 'cash' | 'invalid',
  acctname?: string,
  balancetype?: 'inverted',
  amounttype?: 'inverted',
  mktonly?: boolean,
  taxonly?: boolean,
  ignoreAccount?: boolean, // this will cause the entire account to be ignored.  Useful for commenting out an account that you don't want to lose.

  [key: string]: any,
};

export type AssetAccountSettings = BaseAccountSettings & {
  accounttype: 'asset',
  // Asset account settings:
  asOfDate?: string,
  priorDate?: string,
  idcolumn?: string,
};

export type InventoryAccountSettings = BaseInventoryAccountSettings | LivestockInventoryAccountSettings;

export type BaseInventoryAccountSettings =  BaseAccountSettings & {
  accounttype: 'inventory',
  inventorytype?: 'livestock',
  startYear: number, // ignore inventory things prior to this year.
  inCategories?: string[], // list of categories from cash accounts that represent things coming into inventory.  Grain/feed/bales does not have inCategories (it's just harvested)
  outCategories: string[], // list of categories from cash accounts that represent things coming out of inventory
  qtyKey: string, // which key to pull out of the notes on those categories which represents the quantity
  qtyPrecision?: number, // how many decimal places to keep in printing qty and qtyBalance (corn/beans are 3 decimals)
  borrowingBase?: boolean, // whether to include this inventory account in the borrowing base (market-only)
}

export type PriceWeightPoint = {
  weight: number,
  price: number, // per pound
};
export type LivestockInventoryAccountSettings = BaseInventoryAccountSettings & {
  inventorytype: 'livestock',
  rog: number, // expected rate of gain
  trelloOrg?: string, // name of trello organization where Livestock board exists if not the default
};


export function assertAccountSettings(o: any): asserts o is AssetAccountSettings {
  const errs: string[] = [];
  if (!o) {
    errs.push('Settings is null');
  } else {
    switch(o.accounttype) {
      case 'inventory':
        assertInventoryAccountSettings(o);
      break;
      case 'asset':
        assertAssetAccountSettings(o);
      break;
      case 'futures-asset':
      case 'futures-cash':
      case 'cash': 
        assertBaseAccountSettings(o);
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

export function assertBaseAccountSettings(o: any): asserts o is BaseAccountSettings {
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
    if ('ignoreAccount' in o && typeof o.ignoreAccount !== 'boolean') {
      errs.push('Settings has ignoreAccount ('+magenta(o.ignoreAccount)+') but it is not true or false');
    }
  }
  if (errs.length > 0) throw new MultiError({ msg: errs });
}

export function assertAssetAccountSettings(o: any): asserts o is AssetAccountSettings {
  const errs: string[] = [];
  assertBaseAccountSettings(o); // ensures o is object and not null
  if (o.accounttype !== 'asset') {
    errs.push(`Settings accounttype (${o.accounttype}) is not 'asset'`);
  } else {
    if (o.asOfDate && typeof o.asOfDate !== 'string') {
      errs.push('Settings has asOfDate ('+magenta(o.asOfDate)+'), but it is not a string');
    }
    if (o.asOfDate && !o.asOfDate.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
      errs.push('Settings has asOfDate, ('+magenta(o.asOfDate)+'), but it is not of the form YYYY-MM-DD');
    }
    if (o.priorDate && typeof o.priorDate !== 'string') {
      errs.push('Settings has priorDate ('+magenta(o.priorDate)+'), but it is not a string');
    }
    if (o.priorDate && !o.priorDate.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
      errs.push('Settings has priorDate, ('+magenta(o.priorDate)+'), but it is not of the form YYYY-MM-DD');
    }
    if (o.idcolumn && typeof o.idcolumn !== 'string') {
      errs.push('Settings has idcolumn, ('+magenta(o.idcolumn)+'), but it is not a string');
    }
  }
  if (errs.length > 0) throw new MultiError({ msg: errs });
}

export function assertInventoryAccountSettings(o: any): asserts o is InventoryAccountSettings {
  const errs: string[] = [];
  assertBaseAccountSettings(o); // ensures o is not null and is an object
  if (o.accounttype !== 'inventory') {
    errs.push(`Settings accounttype (${o.accounttype}) is not inventory`);
  } else {
    if (!o.startYear || typeof o.startYear !== 'number') errs.push('Settings startYear ('+magenta(o.startYear)+') is not a number');
    if (o.inCategories && typeof o.inCategories !== 'string') {
      if (Array.isArray(o.inCategories)) {
        if (o.inCategories.filter(c => typeof c !== 'string').length > 0) {
          errs.push('Settings has inCategories, ('+stringify(o.inCategories)+'), and it is an array, but some entries are not strings.');
        }
      } else {
        errs.push('Settings has inCategories, ('+stringify(o.inCategories)+'), but it is neither a string nor an array of strings');
      }
    }
    if (typeof o.outCategories !== 'string') {
      if (Array.isArray(o.outCategories)) {
        if (o.outCategories.filter(c => typeof c !== 'string').length > 0) {
          errs.push('Settings has outCategories, ('+stringify(o.outCategories)+'), and it is an array, but some entries are not strings.');
        }
      } else if (!o.outCategories) {
        errs.push('Settings is missing required property outCategories');
      } else {
        errs.push('Settings has outCategories, ('+stringify(o.outCategories)+'), but it is neither a string nor an array of strings');
      }
    }
    if (!o.qtyKey || typeof o.qtyKey !== 'string') errs.push('Settings qtyKey ('+magenta(o.qtyKey)+') is missing or is not a string');
    if (('qtyPrecision' in o) && typeof o.qtyPrecision !== 'number') errs.push('Settings qtyPrecision exists ('+magenta(o.qtyPrecision)+') but it is not a number');
    if (('borrowingBase' in o) && typeof o.borrowingBase !== 'boolean') errs.push('Settings borrowingBase exists ('+magenta(o.borrowingBase)+') but it is not true or false');
  }
  if (errs.length > 0) throw new MultiError({ msg: errs });
}

export function isLivestockInvetoryAccountSettings(o: any): o is LivestockInventoryAccountSettings {
  try {
    assertLivestockInventoryAccountSettings(o);
    return true;
  } catch(e: any) {
    return false;
  }
}

export function assertLivestockInventoryAccountSettings(o: any): asserts o is LivestockInventoryAccountSettings {
  let errs: string[] = [];
  assertInventoryAccountSettings(o);
  if (o.inventorytype !== 'livestock') {
    errs.push(`Settings inventorytype (${o.inventorytype}) is not 'livestock'`);
  } else {
    if (typeof o.rog !== 'number') {
      if ('trelloOrg' in o && typeof o.trelloOrg !== 'string') {
        errs.push('Settings has trelloOrg, but it is not a string');
      }
      if (!o.rog) {
        errs.push('Settings is missing required property rog (rate of gain)');
      } else {
        errs.push('Settings has rog ('+magenta(o.rog)+'), but it is not a number');
      }
    }

  }
  if (errs.length > 0) throw new MultiError({ msg: errs });
}

export type InventoryNote = {
  [qtyKey: string]: number
};
export function assertInventoryNote(qtyKey: string, o: any): asserts o is InventoryNote {
  if (!o) throw new MultiError({ msg: 'note is empty' });
  if (typeof o !== 'object') throw new MultiError({ msg: 'note is not an object' });
  if (typeof o[qtyKey] !== 'number') throw new MultiError({ msg: `note does not contain quantity key ${qtyKey}` });
}

// This overlaps the json schema's found in ../ledger/postValidation for
// cattle notes.  This type does not have the outid(s), loads, or other
// things that the inventory doesn't really care much about
export function assertPriceWeightPoint(o: any): asserts o is PriceWeightPoint {
  if (!o || typeof o !== 'object') {
    throw new MultiError({ msg: 'Candidate PriceWeightPoint is not a an object' });
  }
  const errs: string[] = [];
  if (typeof o.weight !== 'number') errs.push(`weight property (${o.weight}) is missing or not a number for PriceWeightPoint`);
  if (typeof o.price !== 'number') errs.push(`price property (${o.price}) is missing or not a number for PriceWeightPoint`);
  if (errs.length > 0) throw new MultiError({ msg: errs });
}
export function assertPriceWeightPoints(o: any): asserts o is PriceWeightPoint[] {
  if (!Array.isArray(o)) throw new MultiError({ msg: 'Must be an array' });
  for (const p of (o as any[])) {
    assertPriceWeightPoint(p);
  }
}

export type LivestockInventoryNote = InventoryNote & {
  head: number,
  weight: number,
};
export function assertLivestockInventoryNote(o: any): asserts o is LivestockInventoryNote {
  assertInventoryNote('head', o);
  let errs: string[] = [];
  if (typeof o.weight !== 'number') errs.push(`note does not countain weight as a number`);
  if (typeof o.aveValuePerWeight !== 'number') {
    if (Array.isArray(o.aveValuePerWeight)) {
      if ((o.aveValuePerWeight as any[]).length < 2) {
        errs.push('Settings has aveValuePerWeight array, but it has less than two points in it');
      }
      for (const [index, p] of (o.aveValuePerWeight as any[]).entries()) {
       try { assertPriceWeightPoint(p) }
         catch(e: any) {
          errs = [
            ...errs,
            ...MultiError.wrap(e, 'Settings has aveValuePerWeight array, but index '+magenta(index)+' with value ('+stringify(p)+') is not a valid PriceWeightPoint').msgs()
          ];
        }
      }
    }
  }
}


// LineAccountInfo is the info about the account stored with each line: i.e. the account
// object w/o the actual account lines and originAcct lines
export type LineAccountInfo = {
  name: string,
  filename: string,
  id: string, // if it came from Google, this is the file id.  If it came from node file, this is same as filename
  settings: AccountSettings,
  origin?: Omit<OriginAccount, 'lines'>,
  //[key: string]: any,      // can have any others
};
export function assertLineAccountInfo(a: any): asserts a is LineAccountInfo {
  const errs: string[] = [];
  if (!a) throw `LineAccountInfo cannot be null`;
  if (!a.name || typeof a.name !== 'string') errs.push(`LineAccountInfo has no name`);
  if (!a.filename || typeof a.filename !== 'string') errs.push(`LineAccountInfo has no filename`);
  if (!a.id || typeof a.id !== 'string') errs.push(`LineAccountInfo has no id`);
  if ('settings' in a) {
    try { 
      assertAccountSettings(a.settings) 
    } catch(e: any) {
      e = MultiError.wrap(e, `Settings (${stringify(a.settings)}) is not a valid AccountSettings`);
      errs.push(...e.msgs());
    }
  }
  if ('lines' in a) errs.push('LineAccountInfo cannot have lines');
  if (a.origin) {
    if ('lines' in a.origin) errs.push('LineAccountInfo cannot have origin.lines');
    if (!a.origin.name) errs.push('LineAccountInfo origin must have name');
    if (!a.origin.filename) errs.push('LineAccountInfo origin must have filename');
  }

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
  acct: LineAccountInfo, // all the info about the account for this line, minus the lines
  stmtacct?: string, // original "account" string from sheet (for futures w/ multiple statement origins)
  lineno: number,
  stmtlineno?: number, // on futures accounts, this is the lineno from the original statement
  [key: string]: any,
};
export function assertAccountTx(l: any): asserts l is AccountTx {
  const errs: string[] = [];
  if (!l) throw new MultiError({ msg: [ `Line must be truthy` ]});
  try { 
    assertLineAccountInfo(l.acct) 
  } catch(e: any) {
    e = LineError.wrap(e, l, `line.acct is not a valid LineAccountInfo`);
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

export type InventoryAccountTx = AccountTx & {
  qty: number,
  qtyBalance: number,
  aveValuePerQty: number,
  taxAmount?: number,
  taxBalance?: number,
}
export type LivestockInventoryAccountTx = InventoryAccountTx & {
  weight: number,
  weightBalance: number,
  aveValuePerWeight: number,
  aveWeightPerQty: number,
  taxAmount: number, // required for livestock (FIFO)
  taxBalance: number,
};

export function assertInventoryAccountTx(o: any): asserts o is InventoryAccountTx {
  const errs: string[] = [];
  assertAccountTx(o);
  if (typeof o.qty !== 'number') errs.push(`qty (${o.qty}) is not a number`);
  if (typeof o.qtyBalance !== 'number') errs.push(`qtyBalance (${o.qtyBalance}) is not a number`);
  if (typeof o.aveValuePerQty !== 'number') errs.push(`aveValuePerQty (${o.aveValuePerQty}) is not a number`);
  if ('taxAmount' in o && typeof o.taxAmount !== 'number') errs.push(`taxAmount exists (${o.taxAmount}) and is not a number`);
  if ('taxBalance' in o && typeof o.taxBalance !== 'number') errs.push(`taxBalance exists (${o.taxBalance}) and is not a number`);
  if (errs.length > 0) throw new LineError({ msg: errs, line: o });
};

export function assertLivestockInventoryAccountTx(o: any): asserts o is InventoryAccountTx {
  const errs: string[] = [];
  assertInventoryAccountTx(o);
  if (typeof o.weight !== 'number') errs.push(`weight (${o.weight}) is not a number`);
  if (typeof o.weightBalance !== 'number') errs.push(`weightBalance (${o.weightBalance}) is not a number`);
  if (typeof o.aveValuePerWeight !== 'number') errs.push(`aveValuePerWeight (${o.aveValuePerWeight}) is not a number`);
  if (typeof o.aveWeightPerQty !== 'number') errs.push(`aveWeightPerQty (${o.aveWeightPerQty}) is not a number`);
  if (typeof o.taxAmount !== 'number') errs.push(`taxAmount (${o.taxAmount}) and is not a number`);
  if (typeof o.taxBalance !== 'number') errs.push(`taxBalance (${o.taxBalance}) and is not a number`);
  if (errs.length > 0) throw new LineError({ msg: errs, line: o });
};


export type OriginLine = {
  date: Moment,
  lineno: number,
  acct: {
    name: string,
    filename: string,
    id: string,
  },
  [key: string]: any
};
export function assertOriginLine(o: any): asserts o is OriginLine {
  if (!o) throw new MultiError({ msg: `OriginLine cannot be null` });
  const errs: string[] = [];
  if (!o.date || !isMoment(o.date)) errs.push(`OriginLine date is not a moment`);
  if (typeof o.lineno !== 'number') errs.push(`OriginLine has no lineno`);
  if (!o.acct || typeof o.acct.name !== 'string' || typeof o.acct.filename !== 'string' || typeof o.acct.id !== 'string') {
    errs.push(`OriginLine acct (${o.acct})is missing or does not have name and filename and id`);
  }
  if (errs.length > 0) throw new MultiError({ msg: errs });
};
export type OriginAccount = {
  name: string,
  filename: string,
  id: string,
  lines: OriginLine[],
};
export function assertOriginAccount(o: any): asserts o is OriginAccount {
  if (!o) throw new MultiError({ msg: `OriginAccount cannot be null` });
  const errs: string[] = [];
  if (typeof o.name !== 'string') errs.push(`OriginAccount has no name`);
  if (typeof o.filename !== 'string') errs.push(`OriginAccount has no filename`);
  if (typeof o.id !== 'string') errs.push('OriginAccount has no id');
  if (!('lines' in o)) {
    errs.push('OriginAccount must have lines');
  } else {
    for (const [index, line] of o.lines.entries()) {
      try { assertOriginLine(line) }
      catch(e: any) {
        e = MultiError.wrap(e, `OriginLine ${index} failed validation`);
        errs.push(...e.msgs());
      }
    }
  }
  if (errs.length > 0) throw new MultiError({ msg: errs });
}

export type Account = {
  filename: string,
  name: string,
  id: string, // for file from google this is the resource id, for file from disk this is same as filename
  settings: AccountSettings,
  templateLineno?: number,
  header: string[],
  origin?: OriginAccount,
  lines: AccountTx[];
};
export function assertAccount(a: any): asserts a is Account {
  if (!a) throw new MultiError({ msg: `Account cannot be null` });
  const errs: string[] = [];

  if (!a.name || typeof a.name !== 'string') errs.push(`Account has no name`);
  if (!a.filename || typeof a.filename !== 'string') errs.push(`Account has no filename`);
  if (!a.id || typeof a.id !== 'string') errs.push(`Account has no id`);
  try { 
    assertAccountSettings(a.settings) 
  } catch(e: any) {
    e = MultiError.wrap(e, `Settings (${stringify(a.settings)}) is not a valid AccountSettings`);
    errs.push(...e.msgs());
  }
  if (('templateLineno' in a) && typeof a.templateLineno !== 'number') {
    errs.push('Account has templateLineno, but it is not a number');
  }
  if (!a.header || !Array.isArray(a.header)) {
    errs.push('Account has no header or it is not an array');
  } else {
    for (const [index, h] of a.header.entries()) {
      if (typeof h !== 'string') errs.push(`Account header at index ${index} (${JSON.stringify(h)}) is not a string`);
    }
  }
  if ('origin' in a && a.origin) {
    try { assertOriginAccount(a.origin) }
    catch(e: any) {
      e = AccountError.wrap(e, a, `Account has origin, but origin does not pass validation`);
      errs.push(...e.msgs());
    }
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

  if (errs.length > 0) throw new MultiError({ msg: errs });
}

export type InventoryAccount = Account & {
  settings: InventoryAccountSettings,
  lines: InventoryAccountTx[],
};
export type LivestockInventoryAccount = InventoryAccount & {
  settings: LivestockInventoryAccountSettings,
  lines: LivestockInventoryAccountTx[],
};
export function assertInventoryAccount(a: any): asserts a is InventoryAccount {
  const errs: string[] = [];
  assertAccount(a);
  assertInventoryAccountSettings(a.settings);
  for (const l of a.lines) {
    try { assertInventoryAccountTx(l) }
    catch(e: any) {
      e = LineError.wrap(e, l, `Line failed InventoryAccountTx validation`);
      errs.push(...e.msgs());
    }
  }
  if (errs.length > 0) throw new MultiError({ msg: errs });
}
export type AveValuePerWeightNote = {
  aveValuePerWeight: number | PriceWeightPoint[]
};
export function assertAveValuePerWeightNote(o: any): asserts o is AveValuePerWeightNote {
  if (!o || typeof o !== 'object') throw new MultiError({ msg: 'Note is not an object or is null' });
  if (!('aveValuePerWeight' in o)) throw new MultiError({ msg: 'Note does not have aveValuePerWeight' });
  if (Array.isArray(o.aveValuePerWeight)) {
    assertPriceWeightPoints(o.aveValuePerWeight)
    return;
  }
  if (typeof o.aveValuePerWeight !== 'number') throw new MultiError({ msg: 'aveValuePerWeight in note is neither a number or a series of price/weight points' });

};
export function assertLivestockInventoryAccount(a: any): asserts a is LivestockInventoryAccount {
  let errs: string[] = [];
  assertAccount(a); // I intentionally did not do assertInventoryAccount here b/c that will just redundantly assertInventoryAccountTx on all the lines
  assertLivestockInventoryAccountSettings(a.settings);
  for (const l of a.lines) {
    try { assertLivestockInventoryAccountTx(l) }
    catch(e: any) {
      e = LineError.wrap(e, l, `Line failed LivestockInventoryAccountTx validation`);
      errs = [ ...errs, ...e.msgs() ];
    }
  }
  // Also assert that at least the first line has a aveValuePerWeight entry in the note
  if (a.lines.length < 1) {
    errs.push('The account has no lines.  For a livestock inventory account, first line must exist and have aveValuePerWeight in note.');
  } else {
    try {
      assertAveValuePerWeightNote(a.lines[0]);
    } catch (e: any) {
      e = LineError.wrap(e, a.lines[0], `First line failed LivestockInventoryAccount validation: note was not valid`);
      errs = [ ...errs, ...e.msgs() ];
    }
  }

  if (errs.length > 0) throw new MultiError({ msg: errs });
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
  originals: Account[],
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
  if (a.originals) {
    for (const acct of a.originals) {
      try { 
        assertAccount(acct);
      } catch(e: any) {
        throw MultiError.wrap(e, `Original account ${acct.name} was not a valid Account type`);
      }
    }
  }
}


