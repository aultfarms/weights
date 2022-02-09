const _ = require('lodash');
const moment = require('moment');
const chalk = require('chalk');
const err = require('./err');
const numeral = require('numeral');
const settingsParser = require('./settings-parser');
const util = require('./util');

function weHave(v) {
  if (typeof v === 'string') {
    return v !== '';
  }
  return typeof v !== 'undefined';
}
function safesetNumber(n) {
  if (!n) return 0; // handles undefined, 0, ''
  if (typeof n === 'string') return numeral(n).value();
  return n;
}
function assetsErr(line,msg) {
  return err(line, 'assetsToTxAccts: '+msg);
}
function lineToStr(l) {
  l = _.cloneDeep(l);
  l.acct = "<"+l.acct.name+">";
  let originLineStr = `<OriginLine: {`;
  if (weHave(l.originLine?.taxPriorValue)) originLineStr += ` taxPriorValue: ${l.originLine.taxPriorValue} `;
  if (weHave(l.originLine?.mktPriorValue)) originLineStr += ` mktPriorValue: ${l.originLine.mktPriorValue} `;
  if (weHave(l.originLine?.taxCurrentValue)) originLineStr += ` taxCurrentValue: ${l.originLine.taxCurrentValue} `;
  if (weHave(l.originLine?.mktCurrentValue)) originLineStr += ` mktCurrentValue: ${l.originLine.mktCurrentValue} `;
  originLineStr += '}>';
  l.originLine = originLineStr;
  l.date = l.date.format('YYYY-MM-DD');
  return JSON.stringify(l,false,'  ');
}
function ledger2Str(acct) {
  return JSON.stringify(_.omit(acct, [ 'lines', 'originLines' ])) + '\n' + _.join(_.map(acct.lines, lineToStr), '\n');
}
function printLedger(acct,msg) {
  console.log(ledger2Str(acct));
}
function printErrors(errs, acct) {
  console.dir(errs);
  if (acct) {
    console.log('ERRORS WERE FROM THIS ACCOUNT: ');
    printLedger(acct);
  }
}
function pushError(errs, errstr, acct) {
  errs.push(errstr);
  if (errs.length > 10) {
    console.log('More than 10 errors, exiting now..');
    printErrors(errs, acct);
    process.exit(1);
  }
}

function moneyEquals(a,b) {
  return (Math.abs(a-b) < 0.01); // difference is less than a cent, then they are equal
}


function balanceAtDate(date /* moment */, acct) {
  let balance = acct.lines[0].balance;
  for(i=1; i<acct.lines.length; i++) {
    const l = acct.lines[i];
    if (!l.date.isAfter) {
      throw new Error('YOU HAVE A BAD DATE IN THIS LINE: '+ JSON.stringify(l,false,'  '));
    }
    if (l.date.isAfter(date)) break; // found first one after our target, so balance is whatever we had last
    balance = l.balance;
  }
  return balance;
}


const assetLinesToAccts = (accts, acct) => {

  // 1: if acct has idcolumn (land), append to category:
  if (acct.settings.idcolumn) {
    acct.lines = _.map(acct.lines, l => {
      l.category += '-'+l[acct.settings.idcolumn];
      return l;
    })
  }

  // 2: Make an account from each line
  _.each(acct.lines, l => {
    // Account name is just the category of this asset
    // unless account has accountname override that smooshes all lines into single account
    let name = l.category;
    if (acct.settings.acctname) {
      name = acct.settings.acctname;
      if (!l.category) l.category = name; // mainly for futures-asset
    }


    // If line has an "asOfDate", use that first, then use setting on sheet if available
    const asOfDate = l.asOfDate || acct.settings.asOfDate;
    if (!asOfDate) {
      throw new assetsErr(`ERROR: neither line nor sheet has asOfDate.  Line is: ${JSON.stringify(l,false,'  ')}, Acct is: ${JSON.stringify(acct,false,'  ')}`);
    }

    // Decide if this line has tax account info and if it has mkt account info
    let hasTax = false;
    let hasMkt = false;

    if (acct.settings.mktonly) {
      hasTax = false;
      hasMkt = true;
    } else if (acct.settings.taxonly) {
      hasTax = true;
      hasMkt = false;
    } else { // Otherwise, not overriden at the account level, decide from line values
      if (weHave(l.taxAssetid) || weHave(l.taxCost) || weHave(l.taxPriorValue) || weHave(l.taxCurrentValue)) {
        hasTax = true;
      }
      if (weHave(l.purchaseValue) || weHave(l.mktInitialValue) || weHave(l.mktPriorValue) || weHave(l.mktCurrentValue)) {
        hasMkt = true;
      }
    }
    if (!hasTax && !hasMkt) {
      throw new assetsErr(`ERROR: line ${l.lineno} of acct ${acct.name} had neither tax values nor mkt values!  l = ${JSON.stringify(l,false,'  ')}`);
    }


    // Create the asset account as a descendant of the spreadsheet itself
    // And make up to 2 copies: one for tax and one for mkt so there is no overlap between them
    let assetacct = { 
      ...acct,
      // name is set below w/ tax and mkt
      settings: _.cloneDeep(acct.settings), // clean copy
      originAcct: { sheet: acct.name, filename: acct.filename },
      originLines: []
    };
    // Now make tax and mkt copies, adding tax and mkt to the account names:
    let taxAssetAcct = null;
    if (hasTax) {
      taxAssetAcct = _.cloneDeep(assetacct);
      taxAssetAcct.name = `tax.${name}`;
      taxAssetAcct.settings = { ...taxAssetAcct.settings, taxonly: true };
    }
    let mktAssetAcct = null;
    if (hasMkt) {
      mktAssetAcct = _.cloneDeep(assetacct);
      mktAssetAcct.name = `mkt.${name}`;
      mktAssetAcct.settings = { ...mktAssetAcct.settings, mktonly: true };
    }


    // Does accumulator already have either of these account names?  If so, keep its info and lines instead of what we just made
    if (hasTax && accts[taxAssetAcct.name]) taxAssetAcct = accts[taxAssetAcct.name];
    if (hasMkt && accts[mktAssetAcct.name]) mktAssetAcct = accts[mktAssetAcct.name];

    // compute our new line that will become the TX line eventually
    const originLine = {
      ...l,
      asOfDate,
      date: moment(asOfDate), // use this moment to sort by
    }
    // Push onto lines for this new account
    if (taxAssetAcct) taxAssetAcct.originLines.push(_.cloneDeep(originLine));
    if (mktAssetAcct) mktAssetAcct.originLines.push(_.cloneDeep(originLine));

    // Place these accounts into accumulator
    if (taxAssetAcct) accts[taxAssetAcct.name] = taxAssetAcct;
    if (mktAssetAcct) accts[mktAssetAcct.name] = mktAssetAcct;

  });
  return accts;
}




module.exports = function(input_accts) {
  let accts = {};

  // Multi-pass process:
  // Pass 1: get all the accounts created and keyed by name
  _.each(input_accts, acct => {
    switch(acct.settings.accounttype) {
      case 'cash':
      case 'futures-cash':
        if (accts[acct.name]) {
          throw assetsErr(`Account type is 'cash' and therefore shouldn't be merged, but the account name (${acct.name}) already exists`);
        }
        accts[acct.name] = acct;
      break;
      case 'asset':
      case 'inventory':
      case 'futures-asset':
        accts = assetLinesToAccts(accts, acct);
      break;
      default:
        throw assetsErr(`acct ${acct.name} from file ${acct.filename} has an unrecognized accounttype: ${acct.settings.accounttype}.`);
    }
  });

  if (weHave(accts[undefined])) {
    throw assetsErr(`ERROR: after generating initial accounts from assets, there are undefined accounts (i.e. name is undefined).  This is most likely because you have empty lines coming through.  `
                   +`The entries with undefined name are: ${JSON.stringify(accts[undefined],false,'  ')}`);
  }

  const errs = [];
  _.each(accts, (acct,name) => {
    switch(acct.settings.accounttype) {
      case 'asset':
      case 'inventory':
      case 'futures-asset':

        //----------------------------------------------------------------------
        // Pass 2: For each account, sort asset origin lines by date so we have consistent ordering for balance computations
        acct.originLines = _.sortBy(acct.originLines, 'date');

        //------------------------------------------------------------------
        // SPECIAL:For futures-asset account only, group all the individual things for each month (i.e. that have the same asOfDate) 
        // into a single net mktCurrentValue and taxCurrentValue entry, and force the category to just "futures-asset" 
        if (acct.settings.accounttype === 'futures-asset') {
          const unique_asofdates = _.uniq(_.map(acct.originLines, 'asOfDate')).sort();
          acct.originLines = _.map(unique_asofdates, d => {
            const lines_w_date = _.filter(acct.originLines, l => l.asOfDate === d);
            const cumulative_line = _.omit({
              ...(_.cloneDeep(lines_w_date[0])), // keep all the extraneous stuff from initial line
              description: `Cumulative entry for ${lines_w_date.length} entries in futures-asset account for asOfDate of ${d}`,
              // Then replace specific entries with cumulative totals:
              mktCurrentValue:   _.reduce(lines_w_date, (sum,l) => sum + l.mktCurrentValue, 0),
              mktInitialValue:   _.reduce(lines_w_date, (sum,l) => sum + l.mktInitialValue, 0),
              mktNetValueChange: _.reduce(lines_w_date, (sum,l) => sum + l.mktNetValueChange, 0), 
            // Remove the stuff that doesn't make sense anymore:
            }, [ 'qty', 'txtype', 'trademonth', 'commodity', 'strike', 'unitsPerContract', 'initialValuePerUnit', 'currentValuePerUnit' ]);
            // Now return just this one line for this date (which map will then put in this slot for the main array of lines)
            return cumulative_line;
          });
        }

        
        //---------------------------------------------------------------
        // Pass 3: Make the TX lines.
        // Turn each line in asset accounts into separate tx's for asOfDate, initialDate(inventory), purchaseDate(asset), and saleDate (asset)
        // Each line has date, description, amount, category, note, acct, originLine, assetTxType
        acct.lines = _.reduce(acct.originLines, (acc,l) => {
          const lines_to_push = [];
          if (!acct.settings.mktonly && !acct.settings.taxonly) {
            throw new assetsErr(`ERROR: asset acct ${acct.name} has neither mktonly nor taxonly setting, but that should have been figured out automatically`);
          }

          const linetemplate = {
            originLine: _.cloneDeep(l),
            category: l.category,
            lineno: l.lineno,
            acct: _.omit(acct, [ 'lines', 'originLines' ]), // eliminate circular references
          };
          // A Purchase goes in as a mid-year TX for both taxes and mkt.
          // Both use purchaseDate, but taxes use taxCost and mkt uses purchaseValue
          // inventory accounts call it initialDate and mktInitialValue, but they mean same thing as purchaseDate and purchaseValue
          if (l.purchaseDate || l.initialDate) { // assets
            const value = acct.settings.taxonly ? l.taxCost : (l.purchaseValue || l.mktInitialValue);
            // If we have a date but we do not have a value, then don't insert a purchase. (old things we don't remember).
            // If we DO have a value, then go ahead and use that
            if (weHave(value)) {
              const date = l.purchaseDate || l.initialDate; // default purchaseDate, fallback initialDate
              const newline = _.cloneDeep(linetemplate);
              newline.date = moment(date, 'YYYY-MM-DD');
              newline.description = l.purchaseDate ? "Asset Purchase" : "Asset inital addition to inventory";
              newline.assetTxType = l.purchaseDate ? 'PURCHASE' : 'INITIAL';
              newline.amount = safesetNumber(acct.settings.taxonly ? l.taxCost : (l.purchaseValue || l.mktInitialValue)); // inventory accounts use l.mktInitialValue instead of purchaseValue
              newline.expectedPriorValue = 0; // on a purchase, we are expecting to start from 0
              newline.priorDate = moment(date, 'YYYY-MM-DD').subtract(1, 'days'); // day before purchase, we should be zero
              lines_to_push.push(newline);

              // Now, if we just pushed a purchase, but the priorDate for the originLine is AFTER the purchase,
              // then we have an entry that was purchased before 2020 when we started this so we have no history
              // to fixup the expectedPriorValue.  Add another entry to fix that if needed:
              const priorDate = moment(l.priorDate || acct.settings.priorDate, 'YYYY-MM-DD');
              if (newline.date.isBefore(priorDate)) {
                const newline = _.cloneDeep(linetemplate);
                newline.date = _.cloneDeep(priorDate);
                newline.description = "Initializing prior balance value after old purchase";
                newline.assetTxType = 'AS-OF';
                newline.amount = 'AS-OF_COMPUTE_FROM_EXPECTED_BALANCE',
                // Force "current" value to be expected "prior" value (i.e. the next TX will be the as-of TX that will check prior value)
                newline.expectedCurrentValue = safesetNumber(acct.settings.taxonly ? l.taxPriorValue : l.mktPriorValue);
                lines_to_push.push(newline);
              }
            }
          }
          
          // An asOfDate TX should compute the amount based on the specified balance
          if (l.asOfDate) { // all asset/inventory types, including futures-asset
            const newline = _.cloneDeep(linetemplate);
            newline.date = moment(l.asOfDate, 'YYYY-MM-DD');
            newline.description = "asOfDate Balance Adjustment.";
            if (l.description) newline.description += "  Orig desc: "+l.description;
            newline.assetTxType = 'AS-OF';
            newline.amount = "AS-OF_COMPUTE_FROM_EXPECTED_BALANCE";
            newline.expectedCurrentValue = safesetNumber(acct.settings.taxonly ? l.taxCurrentValue : l.mktCurrentValue);
            const priorValue = acct.settings.taxonly ? l.taxPriorValue : l.mktPriorValue;
            if (weHave(priorValue)) {
              newline.expectedPriorValue = safesetNumber(priorValue);
              newline.priorDate = moment(l.priorDate || acct.settings.priorDate, 'YYYY-MM-DD');
            }
            lines_to_push.push(newline);
          }

          // A saleDate TX works just like a purchase TX: amount specified by sale value.  Only applies to mkt.
          // i.e. it is a mid-year transaction to offset an actual trade-in value or check amount
          if (acct.settings.mktonly && l.saleDate && weHave(l.saleValue)) {  // inventory accounts don't use this (only asOfDate updates), only asset accounts use this.
            // Note: you actually cannot say that the expectedCurrentValue is 0 after sale, because we probably
            // didn't have the exact estimated value in there before the sale.  There will be a net balance
            // that is expensed/incomed at the end of the year/period
            const newline = _.cloneDeep(linetemplate);
            newline.date = moment(l.saleDate, 'YYYY-MM-DD');
            newline.description = "Asset sold.";
            if (l.description) newline.description += "  Orig desc: "+l.description;
            newline.assetTxType = 'SALE';
            newline.amount = safesetNumber(l.saleValue);
            lines_to_push.push(newline);
          }

          if (lines_to_push.length < 1) {
            pushError(errs,`ERROR: had an original asset account line that resulted in no TX lines upon conversion.  Original line is: ${JSON.stringify(l,false,'  ')}`, acct);
          }

          return acc.concat(lines_to_push);
        },[]);

        //------------------------------------------------------
        // Next, create START entry, either as zero balance or as prior values if we have them.
        // Note, if the first entry is a purchase, and it's originLine also has a non-zero priorValue,
        // then we not only need 
        first = acct.lines[0];
        if (first.description !== 'START') { // If we don't have start, make one
          // default to priorDate on TX, otherwise priorDate on acct, otherwise just one day before first TX
          const startdate = first.priorDate || acct.settings.priorDate || moment(first.date).subtract(1, 'day').format('YYYY-MM-DD');
          const newfirst = {
            description: 'START',
            date: moment(startdate, "YYYY-MM-DD"),
            amount: 0,
            balance: weHave(first.expectedPriorValue) ? first.expectedPriorValue : 0,
            lineno: -1,
            acct: _.cloneDeep(first.acct),
          }
          acct.lines = [ newfirst, ...acct.lines ];
        }

        //------------------------------------------------------------
        // Finally ready to compute the balances/amounts
        // Pass 4: Compute any missing amounts that are supposed to correct balances to equal the currentValue's
        for (let i=1; i<acct.lines.length; i++) { // skip start entry
          const l = acct.lines[i];
          const prev = acct.lines[i-1];
          // First make sure we have a properly-computed amount to force balance to currentValue:
          if (l.amount === "AS-OF_COMPUTE_FROM_EXPECTED_BALANCE") {
            l.amount = l.expectedCurrentValue - prev.balance;
          }
          // Now compute the running balance:
          l.balance = prev.balance + l.amount;
        }


        //----------------------------------------------------------
        // Error handling/checking: verify that the balances all match what spreadsheets said they should be
        _.each(acct.lines, (l,i) => {
          const prev = i > 0 ? acct.lines[i-1] : false;

          // Prior value checks
          if (weHave(l.expectedPriorValue)) {
            if (!l.priorDate || !l.priorDate.isValid()) {
              throw new assetsErr(`ERROR (checking prior): line ${i} of acct ${acct.name} with txtype ${l.assetTxType} has no priorDate to check prior value.  Should have been in acct.settings.priorDate.  acct.settings is: ${JSON.stringify(acct.settings,false,'  ')}, and l.priorDate is ${l.priorDate}`);
            }
            if (!moneyEquals(balanceAtDate(l.priorDate, acct),l.expectedPriorValue)) {
              pushError(errs,`ERROR: line ${i} of acct ${acct.name}: balanceAtDate(${l.priorDate.format('YYYY-MM-DD')}, acct) [${balanceAtDate(l.priorDate,acct)}] !== expectedPriorValue(${l.expectedPriorValue}), l = ${lineToStr(l)}, prev = ${lineToStr(prev)}, acct = ${ledger2Str(acct)}`, acct);
            }
          }

          // currentValue checks
          if (weHave(l.expectedCurrentValue)) {
            if (!moneyEquals(l.balance,l.expectedCurrentValue)) {
              pushError(errs,`ERROR: line ${i} of acct ${acct.name}: l.balance(${l.balance}) !== expectedCurrentValue(${l.expectedCurrentValue}). l = ${lineToStr(l)}`, acct);
            }
          }

          // NaN amount and balance checks:
          if (_.isNaN(l.amount)) {
            pushError(errs, `ERROR: line ${i} of acct ${acct.name}: l.amount is NaN!`);
          }
          if (_.isNaN(l.balance)) {
            pushError(errs, `ERROR: line ${i} of acct ${acct.name}: l.balance is NaN!`);
          }

        });
      break;
    }
  });

  if (errs.length > 1) {
    printErrors(errs);
    throw assetsErr('ERROR: some lines in some accounts had errors, see above');
  }

  return accts;  
}
