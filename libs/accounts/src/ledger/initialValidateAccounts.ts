// Convert the RollingAccountHistory sheets for both bank accounts 
// from XLSX to JSON for easy handling

import debug from 'debug';
import chalk from 'chalk';
import settingsParser from './settings-parser.js';
import numeral from 'numeral';
import { MultiError } from '../err.js';
import rfdc from 'rfdc';
import { 
  RawSheetAccount,
  StatusFunction,
  ValidatedRawTx,
  assertValidatedRawTx,
  ValidatedRawSheetAccount,
  AccountSettings,
  assertAccountSettings,
} from './types.js';

const deepclone = rfdc({ proto: true });
const { green, cyan, yellow, red } = chalk;
const info = debug('af/accounts#initialValidateAccounts:info');
//const trace = debug('af/accounts#initialValidateAccounts:info');


// apply line numbers to each line (starts at 2 because of header row)
// move existing lineno (from statement in futures acct) to stmtlineno
// Note this has to be done BEFORE standardize because prune runs
// before standardize:
function applyLineNumber(l:any,index:number): (typeof l) & { lineno: number, stmtlineno?: number } {
  if (l.lineno) {
    l.stmtlineno = +(l.lineno);
  }
  l.lineno = index + 2;
  return l;
}

function fixCurrencyNumbers(l: any) {
  // Check/Fix every property of l
  for (const [k, v] of Object.entries(l)) {
    if (typeof v !== 'string') continue; // leave numbers alone
    if (k === 'description' || k === 'note') continue; // don't convert these to numbers
    let str: string = v.trim();
    // Is it a date?
    if (str.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
      l[k] = str;
      continue;
    }
    // Has numbers after  dash (parcels, dates, etc.)
    if (str.match(/[0-9]-[0-9]/)) {
      l[k] = str;
      continue;
    }
    // Has characters that would not be in a number
    if (!str.match(/^[\-0-9)($.,]+$/)) {
      l[k] = str;
      continue;
    }
    // Must be a number:
    // Get rid of ( ), but make sure it's still negative
    if (str.match(/[\(\)]/)) {
      str = str
        .replace(/[\(\)]/g,'') // get rid of the parentheses
        .replace(/-/g,'');     // get rid of the leading negative sign if there
      str = `-${str}`;         // put on a negative sign
    }
    // Handle excel's -$- problem
    str = str.replace(/-\$-/,'-');
    // Finally, assign the actual number to the line
    l[k] = numeral(str).value();
  }
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
function getAccountSettings(
  {acct,status} : 
  { acct: RawSheetAccount, status: StatusFunction }
): AccountSettings | null {
  const settingslines = acct.lines.filter(l => !!Object.values(l).find(v => v === 'SETTINGS'));

  // Turn all settings lines into a single settings object
  let settings: any = {};
  for(const l of settingslines) {
    // Parse all non-empty values on line (that aren't SETTINGS) and merge into final output
    for (const [k, v] of Object.entries(l)) {
      if (typeof v !== 'string') continue;
      if (k === 'lineno') continue;
      const str = v.trim();
      if (str === '' || str === 'SETTINGS') continue;
      // Merge any parsed settings into final settings
      const parsed = settingsParser(str);
      if (typeof parsed !== 'object') {
        throw new MultiError({ msg: `A column in the SETTINGS line ${l.lineno} parsed to a non-object.  String to parse was: ${str}` });
      }
      settings = { 
        ...settings,
        ...parsed,
      };
    }
  }
  // Default to cash account type
  if (!settings.accounttype) settings.accounttype = 'cash';
  try { assertAccountSettings(settings) }
  catch(e: any) {
    status(
      red('FAILURE: acct ')+cyan(acct.name)+red(' has invalid Settings: ')+
      JSON.stringify(settings)+
      '.  Errors were: '+JSON.stringify(e)
    );
    return null;
  }

  // Tell user what settings we found:
  if (Object.keys(settings).length > 0) {
    status(yellow('        Found Settings for account ')+green(acct.name)+yellow(JSON.stringify(settings)));
  }
  // Send settings back to put into the acct object
  return settings;
}

function isCommentSettingsIgnoreOrEmptyLine(l: any) {
  // Remove the lineno and acct from the line if they are there
  l = deepclone(l);
  if (l.lineno) delete l.lineno;
  if (l.acct) delete l.acct;
  // Now grab the rest of the values (i.e. the originals):
  const values = Object.values(l);
  // If comment, ignore, settings, discard during filter
  if (values.find(v => v === 'COMMENT' || v === 'IGNORE' || v === 'SETTINGS')) {
    return true;
  }
  // If no "truthy" values, discard line (i.e. an empty line)
  if (values.length < 1 || !values.find(v => !!v)) {
    return true;
  }
  return false;
}


// Given a sheet_to_json-style workbook output (either from xlsx in node or google sheets), 
// fix it up to be ready for account parsing:
// - give things line numbers
// - parse settings
// - check that all needed columns are there
export default function(
  {rawaccts, status=null}
: {rawaccts: RawSheetAccount[], status: StatusFunction | null }
): ValidatedRawSheetAccount[] {
  const st = status ? status : info;
  return rawaccts.map(acct => {
    const acctinfo = {
      name: acct.name,
      filename: acct.filename,
    };
    const ret: any = {
      name: acct.name,
      filename: acct.filename,
      lines: [],
      errors: [] as string[],
    };
    if (!ret.name || typeof ret.name !== 'string') {
      ret.errors.push('Account name from file '+acct.filename+' does not exist.');
      return ret;
    }

    //---------------------------------------------------
    // Grab the settings:
    ret.settings = getAccountSettings({acct,status: st});
    if (!ret.settings) {
      ret.settings = { accounttype: 'invalid' };
      ret.errors.push('Account settings from '+acct.name+' were invalid.');
      return ret;
    }

    //----------------------------------------------------
    // Grab the full set of column names (some objects may not have all keys)
    const colnamesobj: { [key: string]: true } = {};
    for (const l of ret.lines) {
      for (const k of Object.keys(l)) {
        colnamesobj[k] = true;
      }
    }
    const colnames = Object.keys(colnamesobj);


    //----------------------------------------------------
    // Apply line numbers, fix any currency strings, remove settings/ignore/comment, keep any errors:
    let errors: string[] = [];
    ret.lines = acct.lines.reduce((acc: ValidatedRawTx[], l: any, i: number): ValidatedRawTx[] => {
      if (typeof l.acct === 'string') {
        l.stmtacct = l.acct; // save original acct from futures
      }
      l.acct = acctinfo;
      applyLineNumber(l,i);
      fixCurrencyNumbers(l);
      if (isCommentSettingsIgnoreOrEmptyLine(l)) return acc;
      try {
        assertValidatedRawTx(l);
      } catch(e: any) {
        e = MultiError.wrap(e, `Account ${ret.name}, Raw line ${i} failed initial validation`);
        l = {
          ...l,
          acct: acctinfo,
          lineno: l.lineno,
          errors: e.msgs(),
        };
        errors = [ ...errors, ...e.msgs()];
      }
      acc.push(l);
      return acc;
    }, []);

    // Promote all line errors up to the account level
    if (errors.length > 0) {
      ret.errors = [ ...(ret.errors || []), ...errors ];
      return ret;
    }

    //------------------------------------------------------------
    // Verify that we have all the columns/settings we need for each account
    try {
      switch(ret.settings.accounttype) {
        case 'cash':
          assertDateOrWrittenPost(ret);
          assertColumns(ret, colnames, [ 'description', 'balance', 'who', 'category' ]);
        break;
        case 'asset':
          // All asset accounts need these things:
          assertColumns(ret, colnames, [ 'category', 'description', 'purchaseDate', 'purchaseValue', 
                                'mktPriorValue', 'mktCurrentValue', 'mktCurrentDepr', 
                                'saleDate', 'saleValue' ]);
          // Only tax-basis accounts (i.e. !mktonly) need these additional things:
          if (!ret.settings.mktonly) {
            assertColumns(ret, colnames, [ 'taxAssetid', 'taxDescription', 'taxCost', 'taxPriorDepr', 
                                 'taxCurrentDepr', 'taxTotalDepr', 'taxPriorValue', 'taxCurrentValue' ]);
          }
          // Asset account MUST have initialDate and asOfDate in settings
          assertSettings(ret, [ 'asOfDate' ]);
        break;
        case 'inventory':
          assertColumns(ret, colnames, [ 'category', 'initialDate', 'initialQuantity', 'units',
                               'asOfDate', 'quantityChange', 'quantityBalance', 
                               'valuePerUnit', 'mktCurrentValue' ]);
          // Inventory account is not tracked in taxes, must have "mktOnly"
          assertSettings(ret, [ 'mktonly' ]);
          if (!ret.settings.mktonly) {
            throw `settings has mktonly, but inventory account requires it to be truthy and it is not`;
          }
        break;
        case  'futures-cash': 
          assertColumns(ret, colnames, [ 'date', 'qty', 'txtype', 'month', 'commodity',
                               'amount', 'balance', 'transferacct' ]);
        break;
        case 'futures-asset': 
          assertColumns(ret, colnames, [ 'date', 'qty', 'txtype', 'trademonth', 'commodity', 'strike',
                               'mktInitialValue', 'mktCurrentValue', 'mktNetValueChange' ]);
          // Futrues-asset account is not tracked in taxes, must have "mktOnly"
          assertSettings(ret, [ 'mktonly', 'acctname' ]);
          if (!ret.settings.mktonly) {
            throw `settings has mktonly, but futures-asset account requires it to be truthy and it is not`;
          }
        break;
      }
    } catch(e: any) {
      e = MultiError.wrap(e, `failed column/setting validation`);
      ret.errors.concat(e.msgs());
    }
    return ret;
  });
}

function assertSettings(acct: { settings: AccountSettings }, required: string[]) {
  const missing: string[] = [];
  for (const r of required) {
    if (!(r in acct.settings)) missing.push(r);
  }
  if (missing.length > 0) {
    throw new MultiError({ msg: `Missing the following required SETTINGS: ${missing.join(',')}` });
  }
}

function assertColumns(acct: RawSheetAccount, colnames: string[], required: string[]) {
  const missing: string[] = [];
  for (const r of required) {
    if (!colnames.find(n => n === r)) missing.push(r);
  }
  if (missing.length > 0) {
    throw new MultiError({ msg: `Missing the following required columns in ${acct.name}: ${missing.join(', ')}.  The columns that it has are: ${colnames.join(', ')}` });
  }
}

function assertDateOrWrittenPost(acct: RawSheetAccount) {
  const l = acct.lines[0];
  if (!('date' in l)) {
    if (!('writtenDate' in l) || !('postDate' in l)) {
      throw new MultiError({ msg: `Did not have either (date column) or (writtenDate and postDate columns).` });
    }
  }
}


