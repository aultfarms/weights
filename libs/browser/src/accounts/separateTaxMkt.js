const _ = require('lodash');
const err = require('./err');
const chalk = require('chalk');
const numeral = require('numeral');

function separateErr(line,msg) {
  return err(line, 'separateTaxMkt: '+msg);
}

// We have asset/inventory accounts and cash accounts.  Let's return (tax, mkt) tx lines (for P&L) and balances (for balance sheets)

function combineAndSortLines(accts) {
  // Combine lines together:
  let lines = _.reduce(accts, (acc,acct) => _.concat(acc,acct.lines), []);

  // We require dates on each line, so map the lines first to make sure they all have dates or are errors
  lines = _.map(lines, line => {
    if (line.is_error) return line;
    if (line.date) return line;
    const error = separateErr(line, 'combine: line has no date!');
    return {
      is_error: true,
      error,
      msg: error.toString(),
      line,
    };
  });

  // Sort by date
  lines = _.sortBy(lines, (a,b) => {
    if (a.is_error) return 1; // just keep the same order for errors
    return a.date.diff(b)
  });

  // Recompute balances
  lines = _.map(lines, (l,i) => {
    const prev = i===0 ? 0 : lines[i-1].balance;
    return { ...l, balance: prev + l.amount, };
  });

  return lines;
}


module.exports = accts => {
  // All asset/inventory type accounts have taxonly or mktonly set on them.  Cash accounts go in both tax and mkt.
  const taxaccts = _.filter(accts, a => a.settings.taxonly || (!a.settings.mktonly && (a.settings.accounttype === 'cash' || a.settings.accounttype === 'futures-cash')));
  const mktaccts = _.filter(accts, a => a.settings.mktonly || (!a.settings.taxonly && (a.settings.accounttype === 'cash' || a.settings.accounttype === 'futures-cash')));
  const taxlines = combineAndSortLines(taxaccts);
  const mktlines = combineAndSortLines(mktaccts);

  return {
    tax: {
      lines: taxlines,
      accts: taxaccts,
    },
    mkt: {
      lines: mktlines,
      accts: mktaccts,
    },
    errors: _.filter(_.concat(taxlines, mktlines), l => l.is_error),
  };

}
