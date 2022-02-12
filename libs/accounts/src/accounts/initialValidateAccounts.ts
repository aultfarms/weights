// Convert the RollingAccountHistory sheets for both bank accounts 
// from XLSX to JSON for easy handling

import debug from 'debug';
import chalk from 'chalk';
import settingsParser from './settings-parser.js';
import numeral from 'numeral';
import { 
  RawSheetAccount,
  StatusFunction,
  ValidatedRawTx,
  assertValidatedRawTx,
  ValidatedRawSheetAccount,
  AccountSettings,
  assertAccountSettings,
} from './types.js';
import { MultiError } from './err.js';

const { green, cyan, yellow, red } = chalk;
const info = debug('af/accounts#reader:info');


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
    let str: string = v.trim();
    // Is it a date?
    if (str.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) l[k] = str;
    // Has numbers after  dash (parcels, dates, etc.)
    if (str.match(/[0-9]-[0-9]/)) l[k] = str;
    // Has characters that would not be in a number
    if (!str.match(/^[\-0-9)($.,]+$/)) l[k] = str;
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
  const settingslines = acct.lines.filter(l => Object.values(l).find(v => v === 'SETTINGS'));

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


// Given a sheet_to_json-style workbook output (either from xlsx in node or google sheets), 
// fix it up to be ready for account parsing:
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
    // Apply line numbers and fix any currency strings, keep any errors:
    ret.lines = acct.lines.map((l: any, i: number): ValidatedRawTx => {
      if (typeof l.acct === 'string') {
        l.stmtacct = l.acct; // save original acct from futures
      }
      l.acct = acctinfo;
      applyLineNumber(l,i);
      fixCurrencyNumbers(l);
      try {
        assertValidatedRawTx(l);
      } catch(e: any) {
        e = MultiError.wrap(e, `Account ${ret.name}, Raw line ${i} failed initial validation`);
        l = {
          acct: acctinfo,
          lineno: l.lineno,
          errors: e.msgs(),
        };
      }
      return l;
    });

    // Ensure that first line object is not missing any keys that later lines have,
    // because we will validate the account from the first line
    for (const l of ret.lines) {
      for (const k of Object.keys(l)) {
        if (!(k in ret.lines[0])) ret.lines[0][k] = null;
      }
    }

    // Grab the settings:
    ret.settings = getAccountSettings({acct,status: st});
    if (!ret.settings) {
      ret.settings = { accounttype: 'invalid' };
      ret.errors.push('Account settings from '+acct.name+' were invalid.');
      return ret;
    }

    //-------------------------------------------
    // Validate the account
    // Verify that we have all the columns we need for each account
    try {
      switch(ret.settings.accounttype) {
        case 'cash':
          assertDateOrWrittenPost(ret);
          assertColumns(ret, [ 'description', 'balance', 'who', 'category' ]);
        break;
        case 'asset':
          // All asset accounts need these things:
          assertColumns(ret, [ 'category', 'description', 'purchaseDate', 'purchaseValue', 
                                'mktPriorValue', 'mktCurrentValue', 'mktCurrentDepr', 
                                'saleDate', 'saleValue' ]);
          // Only tax-basis accounts (i.e. !mktonly) need these additional things:
          if (!ret.settings.mktonly) {
            assertColumns(ret, [ 'taxAssetid', 'taxDescription', 'taxCost', 'taxPriorDepr', 
                                 'taxCurrentDepr', 'taxTotalDepr', 'taxPriorValue', 'taxCurrentValue' ]);
          }
          // Asset account MUST have initialDate and asOfDate in settings
          assertSettings(ret, [ 'asOfDate' ]);
        break;
        case 'inventory':
          assertColumns(ret, [ 'category', 'initialDate', 'initialQuantity', 'units',
                               'asOfDate', 'quantityChange', 'quantityBalance', 
                               'valuePerUnit', 'mktCurrentValue' ]);
          // Inventory account is not tracked in taxes, must have "mktOnly"
          assertSettings(ret, [ 'mktonly' ]);
          if (!ret.settings.mktonly) {
            throw `settings has mktonly, but inventory account requires it to be truthy and it is not`;
          }
        break;
        case  'futures-cash': 
          assertColumns(ret, [ 'date', 'qty', 'txtype', 'month', 'commodity',
                               'amount', 'balance', 'transferacct' ]);
        break;
        case 'futures-asset': 
          assertColumns(ret, [ 'date', 'qty', 'txtype', 'trademonth', 'commodity', 'strike',
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

function assertColumns(acct: RawSheetAccount, required: string[]) {
  const missing: string[] = [];
  const l = acct.lines[0];
  for (const r of required) {
    if (!(r in l)) missing.push(r);
  }
  if (missing.length > 0) {
    throw new MultiError({ msg: `Missing the following required columns: ${missing.join(', ')}.  The columns that it has are: ${Object.keys(l).join(', ')}` });
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


