const Promise = require('bluebird');

const assetsToTxAccts = require('./assetsToTxAccts');
const standardize = require('./standardize');
const reader = require('./reader');
const prune = require('./prune');
const splits = require('./splits');
const validateBalances = require('./validateBalances');
const separateTaxMkt = require('./separateTaxMkt');
const chalk = require('chalk');
const err = require('./err');
const fs = require('fs');
const numeral = require('numeral');
const moment = require('moment-range').extendMoment(require('moment'));
const table = require('cli-table');

const _ = require('lodash');
const msg = require('./msg');


const errorWithoutCategory = acct => {
  // replace anything in "lines" with an error if it is missing a category
  acct.lines = _.map(acct.lines, item => {
    if (item.is_error) return item;
    if (item.description === 'START') return item; // start lines have no category
    if (!item.category || item.category.trim() === '') {
      const e = err(item, `Missing category!`);
      return {
        is_error: true,
        error: e,
        msg: e.toString(),
        ...item
      };
    }
    return item;
  });
  return acct;
}

const errorIfErrors = results => {
  if (results.errors && results.errors.length > 0) {
    results.errors.forEach((e,i) => console.log(chalk.red(`ERROR ${i}: ${e.msg}`)));
    throw err(`There were ${results.errors.length} errors, aborting`);
  }
}

// If there were blank lines in a file, or somebody forgot a category,
// we could get undefined account names.  Check for that.
function verifyNoUndefinedNames(accts) {
  const errs = [];
  _.each(accts, a => {
    if (typeof a.name === 'undefined') {
      errs.push(`ERROR: undefined account name.  acct = ${JSON.stringify(_.omit(acct, ['lines']),false,'  ')}`);
    }
  });
  if (errs.length > 0) {
    throw new Error('reader: ERROR: had undefined account names.  Details: ', errs);
  }
}




function totalSummaryStr(r) {
  const numlines = _.reduce(r,(sum,a) => sum+a.lines.length,0)
  const numaccts = r.length;
  return `starting with ${numeral(numlines).format('0,0')} total lines in ${numaccts} accounts`;
}
function finalSummaryStr(r) {
  return `Final: (Tax: ${numeral(r.tax.lines.length).format('0,0')} lines in ${r.tax.accts.length} accounts), `
        +       `(Mkt: ${numeral(r.mkt.lines.length).format('0,0')} lines in ${r.mkt.accts.length} accounts), `
        +       `with ${numeral(r.errors.length).format('0,0')} errors`;
  
}

module.exports = opts => {
  msg.green('----------------------------------------------------------------');
  msg.green('------> index: Reading....');

  // Get all files whos names start w/ Account
  const path = __dirname + '/../AccountFiles';
  const accountfiles = fs
    .readdirSync(path)
    .filter(f => f.match(/^Account-/))
    .map(filename => ({ path, filename }));

  console.log(chalk.cyan('******** reader ********'));
  return Promise.reduce(accountfiles, reader, []) // returns array of accts, each item {acct, file, lines}

  .tap(r => console.log(chalk.cyan(`********        prune         ********: ${totalSummaryStr(r)}`)))
  .map(prune) // get rid of comment, settings, and ignore lines

  .tap(r => console.log(chalk.cyan(`********        assets        ********: ${totalSummaryStr(r)}`)))
  .then(assetsToTxAccts) // Convert all asset accounts to regular TX accounts
  .tap(verifyNoUndefinedNames)
  .then(_.values) // convert back to an array of accounts

  .tap(r => console.log(chalk.cyan(`********     standardize      ********: ${totalSummaryStr(r)}`)))
  .map(standardize) // All the lines have consistent fields now

  .tap(r => console.log(chalk.cyan(`********        splits        ********: ${totalSummaryStr(r)}`)))
  .map(splits)      // replaces split master lines with individual split counterparts below it

  .tap(r => console.log(chalk.cyan(`******** errorWithoutCategory ********: ${totalSummaryStr(r)}`)))
  .map(errorWithoutCategory)

  .tap(r => console.log(chalk.cyan(`********   validateBalances   ********: ${totalSummaryStr(r)}`)))
  .map(validateBalances)

  .tap(accts => {
    const errors = _.reduce(accts, (acc,acct) => 
      acc.concat(_.filter(acct.lines, l => l.is_error)),[]);

    if (errors.length > 0) {
      msg.red(errors.length+' LINES HAD ERRORS, ABORTING');
      _.each(errors, e => {
        console.log(chalk.red('ERROR: '), e.msg); // , e.error?.stack)
      });
      throw new Error(errors.length+' LINES HAD ERRORS, ABORTING');
    };
    return accts;
  })
  .tap(r => console.log(chalk.cyan(`********       combine        ********: ${totalSummaryStr(r)}`)))
  .then(separateTaxMkt) // returns { tax: { lines, accts }, mkt: { lines, accts }, errors: [] }
  .tap(errorIfErrors) // print errors and throw if r.errors.length > 0
  .tap(r => console.log(chalk.cyan(`********       finished       ********: ${finalSummaryStr(r)}`)))
};


