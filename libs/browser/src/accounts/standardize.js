const _ = require('lodash');
const moment = require('moment');
const chalk = require('chalk');
const err = require('./err');
const numeral = require('numeral');
const settingsParser = require('./settings-parser');
const util = require('./util');
const clitable = require('cli-table');

function standardizeErr(line,msg) {
  return err(line, 'standardize: '+msg);
}

module.exports = function(acct) {
  // These account types are already standardized, no need to process:
  switch(acct.settings?.accounttype) {
    case 'asset':
    case 'futures-asset':
    case 'inventory':
      return acct;
  }

  //const DEBUGTABLE = new clitable({ head: ['acct', 'line', 'date', 'category', 'amount', 'splitAmount'] });

  acct.lines = _.map(acct.lines, line => {
    try {
      // fix excel's '-$-1,234.00' problems on any numeric values
      //line = _.mapValues(line, v => (typeof v !== 'string' ? v : v.replace(/-\$-/g,'-$')));
      if (line.acct) line.stmtacct = line.acct; // save the original "acct" on the line (futures mainly)
      if (!line.acct) line.acct = _.omit(acct, [ 'lines' ]);
      const isStart = util.isStart(line); // any value is "START" means it's a start line

      // Amounts:
      const isDebitCredit = !exists(line.amount); // an "amount" column overrides any debit/credit
      let amount = isDebitCredit
        ? parseAmountFromDebitCredit(line,acct)
        : numeral(line.amount).value();

      let splitAmount = numeral(line.splitAmount).value();
      // You can set amounttype as 'inverted' in a SETTINGS line
      if (acct.settings.amounttype === 'inverted') {
        amount *= -1.0;
        splitAmount *= -1.0;
      }

      const is_split = line.description?.trim && line.description.trim() === 'SPLIT';
      // Once amount has been inverted if need be, then we can figure out if it is actually a debit
      const is_debit = is_split ? splitAmount < 0 : amount < 0;
  
      // Balance
      let balance = numeral(line.balance).value();
      // You can set balancetype as 'inverted' in a SETTINGS line
      if (acct.settings.balancetype === 'inverted') {
        balance *= -1.0;
      }
  
      // Dates:
      const date = exists(line.date) // a "date" column overrides any written/post dates
        ? parseDate(line.date)
        : parseDateFromWrittenOrPost(line, is_debit);
      const writtenDate = exists(line.writtenDate)
        ? parseDate(line.writtenDate)
        : date; // for non-check accounts w/o a written/post, default them to just the date already on the line
      const postDate = exists(line.postDate)
        ? parseDate(line.postDate)
        : date; // for non-check accounts w/o a written/post, default them to just the date already on the line

      // Note:
      let note;
      try {
        note = settingsParser(safeset(line.note));
      } catch(e) {
        throw standardizeErr(line, 'Note parsing failed for note "'+line.note+'".  Error was: '+e.toString());
      }
  
      // Category
      let category = safeset(line.category);
      if (isStart && !category) {
        category = 'START';
      } else if (isFutures(line)) {
        category = futuresCategory(line, amount);
      }
  
      // Return the final object
      return {
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
               acct: _.omit(acct, [ 'originLines', 'lines' ]),
             lineno: line.lineno, // already on the line
      };
    } catch(e) {
      if (!e.toString().match(/LINE/)) {
        // Add line annotation
        e = standardizeErr(line, 'Uncaught exception: '+e.toString());
      }
      return {
        is_error: true,
        error: e, 
        msg: e.toString(),
        ...line,
      };
    }
  });
  return acct;
}

function exists(thing) {
  if (typeof thing === 'undefined') return false;
  if (thing === '') return false;
  return true;
}
function isFutures(line) {
  if (!exists(line.txtype)) return false;
  if (!exists(line.commodity)) return false;
  return true;
}
function futuresCategory(line, amount) {
  const transferacct = line.transferacct || ''
  // Most lines are just futures-CORN-FEB20 or something like that
  category = `futures-${line.commodity}-${line.month}`;
  // But, CASH and TRANSFER lines need proper transfer category
  if (line.commodity === 'CASH' && line.txtype === 'TRANSFER') {
    const from = 'from:' + (amount < 0 ? 'futures' : transferacct);
    const to   =   'to:' + (amount < 0 ? transferacct : 'futures');
    category = 'transfer-'+from+','+to;
  }
  return category;
}

function safeset(val) {
  if (typeof val !== 'string') return (val ? val : '');
  return (val ? val.trim() : '');
}

function parseAmountFromDebitCredit(line, acct) {
  let amount = 0;
  let debit = 0;
  let credit = 0;
  if (line.debit) debit = numeral(line.debit).value();
  if (line.credit) credit = numeral(line.credit).value();
  if (isNaN(debit) || isNaN(credit)) {
    throw standardizeErr('parseAmountFromDebitCredit: either debit ('+line.debit+' = '+debit+')'
                         + ' or credit ('+line.credit+' = '+credit+') is NaN.');
  }
  amount = credit - debit;
  return amount;
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
function parseDate(str) {
  const d = moment(str, 'YYYY-MM-DD');
  return (d.isValid() ? d : null);
}

function parseDateFromWrittenOrPost(line,is_debit) {
  let writtenDate = null;
  let postDate = null;

  if (line.writtenDate) writtenDate = parseDate(line.writtenDate);
  if (!writtenDate || !writtenDate.isValid()) writtenDate = null;

  if (line.postDate) postDate = parseDate(line.postDate);
  if (!postDate || !postDate.isValid()) postDate = null;

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


