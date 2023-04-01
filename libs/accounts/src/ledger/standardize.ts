import moment, { Moment } from 'moment';
import debug from 'debug';
import numeral from 'numeral';
import omit from 'omit';
import { parse as settingsParser } from './settings-parser.js';
import * as util from './util.js';
import { LineError } from '../err.js';
import type { 
  ValidatedRawSheetAccount, 
  ValidatedRawTx,
  LineAccountInfo,
  StatusFunction,
} from './types.js';
const { isMoment } = moment;

const info = debug('af/accounts#standardize:info');
//const trace = debug('af/accounts#standardize:trace');

function isBeforeDay(a: Moment, b: Moment) {
  const astr = a.format('YYYY-MM-DD');
  const bstr = b.format('YYYY-MM-DD');
  if (astr === bstr) return false; // they are the same day, so "Not before"
  return a.isBefore(b);
}

export default function(
  { accts, status }
: { accts: ValidatedRawSheetAccount[], status?: StatusFunction }
): ValidatedRawSheetAccount[] {
  return accts.map(acct => { 
    if (!status) status = info;

    if (acct.errors && acct.errors.length > 0) {
      status(`Account ${acct.name} has errors, skipping`);
      return acct;
    }

    // These account types are already standardized, no need to process much:
    switch(acct.settings.accounttype) {
      case 'asset':
      case 'futures-asset':
        return acct;
    }

    // For inventory accounts, process the settings to make sure outCategories and inCategories are 
    // arrays and not just a string
    if (acct.settings.accounttype === 'inventory') {
      if (typeof acct.settings.outCategories === 'string') {
        acct.settings.outCategories = [ acct.settings.outCategories ];
      }
      if (typeof acct.settings.inCategories === 'string') {
        acct.settings.inCategories = [ acct.settings.inCategories ];
      }
    }

    // If we get here, then it wasn't one of the "easy" accounts, now process
    // to standardize transactions
    const acctinfo: LineAccountInfo = {
      name: acct.name,
      filename: acct.filename,
      id: acct.id,
      settings: acct.settings,
    };
    if (acct.origin) acctinfo.origin = omit('lines')(acct.origin);


    acct.lines = util.mapSkipErrors(acct.lines, line => {
      try {
        line.acct = acctinfo;
        const isStart = util.isStart(line); // any value is "START" means it's a start line

        // Amounts:
        const isDebitCredit = !exists(line.amount); // an "amount" column overrides any debit/credit
        let amount: number = isDebitCredit
          ? parseAmountFromDebitCredit(line)
          : (numeral(line.amount).value() || 0);

        let splitAmount: number = numeral(line.splitAmount).value() || 0;
        // You can set amounttype as 'inverted' in a SETTINGS line
        if (acct.settings.amounttype === 'inverted') {
          amount *= -1.0;
          splitAmount *= -1.0;
        }

        const is_split: boolean = line.description?.trim() === 'SPLIT';
        // Once amount has been inverted if need be, then we can figure out if it is actually a debit
        const is_debit: boolean = is_split ? splitAmount < 0 : amount < 0;

        // Balance
        let balance: number = numeral(line.balance).value() || 0;
        // You can set balancetype as 'inverted' in a SETTINGS line
        if (acct.settings.balancetype === 'inverted') {
          balance *= -1.0;
        }

        // Dates:
        // Note that dates can be null on split lines until they inhereit their date from
        // their parent.  Until then, they could be null or 'SPLIT'
        const date: Moment | string | null = exists(line.date) // a "date" column overrides any written/post dates
          ? parseDate(line.date)
          : parseDateFromWrittenOrPost(line, is_debit);

        // Don't check the written/post dates because a late cashing check could have them
        // far apart.  Since we already checked for reasonableness on the "date", which is what
        // everything uses from here on out, that is sufficient.
        // IF THIS IS A SPLIT LINE, we want to keep null written or post dates because the split may fill them in
        // from the parent and then adjust the effective date accordingly.  If this is not a split line, then just 
        // default to the already-determined date so everything is filled out in the object.
        const writtenDate: Moment | string | null = exists(line.writtenDate)
          ? parseDate(line.writtenDate)
          : (line.description !== 'SPLIT') ? date : null; // for non-check accounts w/o a written/post, default them to just the date already on the line
        const postDate: Moment | string | null = exists(line.postDate)
          ? parseDate(line.postDate)
          : (line.description !== 'SPLIT') ? date : null; // for non-check accounts w/o a written/post, default them to just the date already on the line

        // Note:
        let note;
        try {
          note = settingsParser(safeset(line.note));
        } catch(e: any) {
          e = LineError.wrap(e, line, `Note parsing failed for note = ${line.note}`);
          throw e;
        }

        // Category
        let category = safeset(line.category);
        if (isStart && !category) {
          category = 'START';
        } else if (isFutures(line)) {
          category = futuresCategory(line, amount);
        }

        // Return the final standardized line object
        let ret: ValidatedRawTx = {
          ...line,
          isStart, // if true, this line has the starting balance for this account
          date,
          description: safeset(line.description),
          amount,
          splitAmount,
          balance,
          who: safeset(line.who),
          category,
          note, // could be a string or a parsed object or an empty string
          writtenDate, // non-check-based accounts don't have either of these, so  
          postDate,    // just default to the only date on the line for each
          acct: acctinfo,
          lineno: line.lineno, // already on the line
        };

        // Add in the inventory account columns
        if (acct.settings.accounttype === 'inventory') {
          const who = 'internal';
          const qty = numeral(line.qty).value() || 0;
          const qtyBalance = numeral(line.qtyBalance).value() || 0;
          const aveValuePerQty = numeral(line.aveValuePerQty).value() || 0;
          ret = { ...ret, who, qty, qtyBalance, aveValuePerQty };
          // Livestock accounts have some additional columns
          if (acct.settings.inventorytype === 'livestock') {
            const weight = numeral(line.weight).value() || 0;
            const weightBalance = numeral(line.weightBalance).value() || 0;
            const aveValuePerWeight = numeral(line.aveValuePerWeight).value() || 0;
            const taxAmount = numeral(line.taxAmount).value() || 0;
            const taxBalance = numeral(line.taxBalance).value() || 0;
            ret = { ... ret, weight, weightBalance, aveValuePerWeight, taxAmount, taxBalance };
          }
        }

        return ret;
      } catch(e: any) {
        e = LineError.wrap(e, line, `Line standardization failed.`);
        if (!line.errors) line.errors = [];
        line.errors.push(...e.msgs());
        return line;
      }
    });

    // And return the new account with these lines instead of the old ones:
    return acct;
  });
}

function exists(thing:any) {
  if (typeof thing === 'undefined') return false;
  if (thing === '') return false;
  return true;
}
function isFutures(line:any) {
  if (!exists(line.txtype)) return false;
  if (!exists(line.commodity)) return false;
  return true;
}
function futuresCategory(line:any, amount: number) {
  const transferacct = line.transferacct || ''
  // Most lines are just futures-CORN-FEB20 or something like that
  let category = `futures-${line.commodity}-${line.month}`;
  // But, CASH and TRANSFER lines need proper transfer category
  if (line.commodity === 'CASH' && line.txtype === 'TRANSFER') {
    const from = 'from:' + (amount < 0 ? 'futures.cash' : transferacct);
    const to   =   'to:' + (amount < 0 ? transferacct : 'futures.cash');
    category = 'transfer-'+from+','+to;
  }
  return category;
}

function safeset(val: any) {
  if (typeof val !== 'string') return (val ? val : '');
  return (val ? val.trim() : '');
}

function parseAmountFromDebitCredit(line: ValidatedRawTx): number {
  let debit: number | null = 0;
  let credit: number | null = 0;
  if (line.debit) debit = numeral(line.debit).value();
  if (line.credit) credit = numeral(line.credit).value();
  if (debit === null || credit === null) {
    throw new LineError({ line, 
      msg: `parseAmountFromDebitCredit: either debit (${line.debit} = ${debit})`
           + ` or credit (${line.credit} = ${credit}) is NaN or null.`
    });
  }
  return credit - debit; // this is the amount
}

// Rules for dates: 
// NOTE: had to get rid of rule #1 below for quarterly statements because I'd have to check that the
// two dates are in the same quarter rather than in the same year.
// 1. If the post date and written date have the same year, use the post date (makes comparison with bank statement simpler)
// 2. If the post date and written date have different years:
//   a. deposited checks are counted on the day they hit the account.
//   b. written checks are counted on the day they are written.
// NOTE: this logic is re-used in the split handler since it is called after this
// one is called.
function parseDate(str: any): Moment | string | null {
  if (!str) return null;
  if (isMoment(str)) return str;
  if (typeof str !== 'string') return null;
  const d = moment(str, 'YYYY-MM-DD');
  // if the str is a string that moment couldn't parse (like SPLIT), 
  // then d.isValid() will return false
  return (d.isValid() ? d : str);
}

function parseDateFromWrittenOrPost(line: any,is_debit: boolean): Moment | null {
  let writtenDate = null;
  let postDate = null;

  if (line.writtenDate) writtenDate = parseDate(line.writtenDate);
  if (!writtenDate || !isMoment(writtenDate)) writtenDate = null;

  if (line.postDate) postDate = parseDate(line.postDate);
  if (!postDate || !isMoment(postDate)) postDate = null;

  // If the postDate is BEFORE the written date, this is an error:
  if (postDate && writtenDate) {
    if (isBeforeDay(postDate, writtenDate)) {
      throw new LineError({ line, msg: `postDate ${postDate.format('YYYY-MM-DD')} is before writtenDate ${writtenDate.format('YYYY-MM-DD')}` });
    }
  }

  // commented rule #1 below for quarterly's: see comments above as to why 
  // handles rule #1 above
  //if (postDate && writtenDate && postDate.year() === writtenDate.year())
  //  return postDate;

  // handles rule #2a above
  // Debit (check we wrote):
  if (is_debit) {
    if (writtenDate) return writtenDate;
    return postDate; // don't have a written date for a check we wrote, go by post date
  }
  // handles rule #2b above:
  // Credit (check written to us):
  if (postDate) return postDate;
  return writtenDate; // Default to written date until we know a post date

  // it is possible that this function returns null for the date: you can't
  // check dates until AFTER splits have been adjusted because split lines
  // can inherit their date from the parent line.  
}


