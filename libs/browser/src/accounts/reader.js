// Convert the RollingAccountHistory sheets for both bank accounts 
// from XLSX to JSON for easy handling

const fs = require('fs');
const xlsx = require('xlsx');
const _ = require('lodash');
const chalk = require('chalk');
const err = require('./err');
const settingsParser = require('./settings-parser');
const numeral = require('numeral');

// apply line numbers to each line (starts at 2 because of header row)
// move existing lineno (from statement in futures acct) to stmtlineno
// Note this has to be done BEFORE standardize because prune runs
// before standardize:
const applyLineNumber = (l,index) => {
  if (l.lineno) l.stmtlineno = l.lineno;
  l.lineno = index + 2;
  return l;
}


// Known things: 
// * Any line with a column whose value is "SETTINGS" is considered a settings line
// * example: "balancetype: inverted; amounttype: inverted"
// balancetype: inverted
// amounttype: inverted
// accounttype: <known values below in main mapper>
// mktonly: true => do not include this account in tax-basis accounting
// idcolumn: parcelid => category should be appended w/ this column as the "id" of each thing in asset account
const getAccountSettings = (acct) => {
  const settingslines = _.filter(acct.lines, l => _.values(l).find(v => v === 'SETTINGS'));

  // Turn all settings lines into a single settings object
  const settings = _.reduce(settingslines, (acc1, l) => {

    // Parse all non-empty values on line (that aren't SETTINGS) and merge into final output
    const netsettings = _.reduce(l, (acc2, v, k) => {
      if (typeof v !== 'string') return acc2;
      if (k === 'lineno') return acc2;
      v = v.trim();
      if (v === "" || v === 'SETTINGS') return acc2;
      return { ...acc2, ...settingsParser(v) };
    }, {});
    // Merge these settings into the accumulator
    return {...acc1, ...netsettings };
  }, {});
  // Tell user what settings we found:
  if (_.keys(settings).length > 0) {
    console.log(chalk.yellow('        Found Settings for account '),chalk.green(acct.name), chalk.yellow(JSON.stringify(settings)));
  }
  // Send settings back to put into the acct object
  return settings;
}


// Read the workbook:
module.exports = function(acc, fileinfo) {
  const { path, filename } = fileinfo;
  console.log(
    chalk.green('------> reader:')+
    chalk.yellow(' reading XLSX file ' + filename)
  );
  const workbook = xlsx.readFile(`${path}/${filename}`);

  // sheets is an array of objects w/ name and sheet
  let sheets = _.map(workbook.SheetNames, s => ({ name: s, sheet: workbook.Sheets[s] }));

  _.each(sheets, s => {

    console.log(
      chalk.yellow('     found account: ' + chalk.green(s.name))
    );

    //-------------------------------------------
    // Extract the initial account info from the sheet (name, lines, settings)
    // acct = { filename, name, lines, settings }
    const acct = {
      filename,
      name: s.name,
      lines: _.map(
        // If you don't put raw: false, it will parse the dates as ints instead of the date string
        xlsx.utils.sheet_to_json(s.sheet, { raw: false } ),
        applyLineNumber
      ),
    };
    acct.settings = getAccountSettings(acct) || {};

    //-------------------------------------------
    // Fix any currency-like things to be numbers:
    acct.lines = _.map(acct.lines, l => _.mapValues(l, (v,k) => {
      const orig = v;
      if (typeof v !== 'string') return v;
      v = v.trim();
      if (v.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) return v; // date
      if (v.match(/[0-9]-[0-9]/)) return v; // has numbers after  dash (parcels, dates, etc.)
      if (!v.match(/^[\-0-9)($.,]+$/)) return v; // has characters that would not be in a number
      // Get rid of ( ), but make sure it's still negative

      if (v.match(/[\(\)]/)) {
        v = v.replace(/[\(\)]/g,'');
        v = v.replace(/-/g,'');
        v = `-${v}`;
      }

      // Handle excel's -$- problem
      v = v.replace(/-\$-/,'-');
      v = numeral(v).value();
      return v;
    }));

    //-------------------------------------------
    // Validate the account
    // Verify that we have all the columns we need for each account
    const colnames = columnHeadersAsObject(s.sheet);

    // Figure out account type:
    const accounttypes = [ 'asset', 'futures-cash', 'futures-asset', 'cash', 'inventory' ];
    acct.settings.accounttype = acct.settings.accounttype || 'cash'; // Default a regular old cash account

    switch(acct.settings.accounttype) {
      case          'cash':
        assertDateOrWrittenPost(acct, colnames);
        assertColumns(acct, colnames, [ 'description', 'balance', 'who', 'category' ]);
      break;
      case         'asset':
        // All asset accounts need these things:
        assertColumns(acct, colnames, [ 'category', 'description', 'purchaseDate', 'purchaseValue', 
                                        'mktPriorValue', 'mktCurrentValue', 'mktCurrentDepr', 
                                        'saleDate', 'saleValue' ]);
        // Only tax-basis accounts (i.e. !mktonly) need these additional things:
        if (!acct.settings.mktonly) {
          assertColumns(acct, colnames, [ 'taxAssetid', 'taxDescription', 'taxCost', 'taxPriorDepr', 
                                          'taxCurrentDepr', 'taxTotalDepr', 'taxPriorValue', 'taxCurrentValue' ]);
        }
        // Asset account MUST have initialDate and asOfDate in settings
        assertSettings(acct, [ 'asOfDate' ]);
      break;
      case     'inventory':
        assertColumns(acct, colnames, [ 'category', 'initialDate', 'initialQuantity', 'units',
                                        'asOfDate', 'quantityChange', 'quantityBalance', 
                                        'valuePerUnit', 'mktCurrentValue' ]);
        // Inventory account is not tracked in taxes, must have "mktOnly"
        assertSettings(acct, [ 'mktonly' ]);
      break;
      case  'futures-cash': 
        assertColumns(acct, colnames, [ 'date', 'qty', 'txtype', 'month', 'commodity',
                                        'amount', 'balance', 'transferacct' ]);
      break;
      case 'futures-asset': 
        assertColumns(acct, colnames, [ 'date', 'qty', 'txtype', 'trademonth', 'commodity', 'strike',
                                        'mktInitialValue', 'mktCurrentValue', 'mktNetValueChange' ]);
        // Futrues-asset account is not tracked in taxes, must have "mktOnly"
        assertSettings(acct, [ 'mktonly', 'acctname' ]);
      break;
      default: 
        throw err(`reader: acct ${acct.name} from file ${acct.filename} has an unrecognized accounttype: ${a}.  Known accounttypes are ${_.join(accounttypes,',')}`);
    }

    acc.push(acct);
  });
  return acc;
}

function assertSettings(acct, required) {
  const missing = _.difference(required, _.keys(acct.settings));
  if (missing.length > 0) {
    throw err(`reader: acct ${acct.name} from file ${acct.filename} is missing the following required SETTINGS: ${_.join(missing,',')}`)
  }
}

function assertColumns(acct, colnames, required) {
  const missing = _.difference(required, _.keys(colnames));
  if (missing.length > 0) {
    throw err(`reader: acct ${acct.name} from file ${acct.filename} is missing the following required columns: ${_.join(missing,', ')}.  The columns that it has are: ${_.join(_.keys(colnames),', ')}`)
  }
}

function assertDateOrWrittenPost(acct, colnames) {
  if (!colnames.date) {
    if (!colnames.writtenDate || !colnames.postDate) {
      throw err(`reader: acct ${acct.name} from file ${acct.filename} did not have either date column or writtenDate and postDate columns.`);
    }
  }
}

function columnHeadersAsObject(sheet) {
  // Find all the keys of row 1 (the keys of the sheet look like 'A1', 'B132', etc.)
  headercols = _.keys(sheet).filter(c => c.match(/^[A-Z]+1$/));
  return _.reduce(headercols, (acc,col) => { acc[sheet[col].v] = true; return acc; }, {});
}

