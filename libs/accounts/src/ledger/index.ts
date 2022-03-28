import chalk from 'chalk';
import numeral from 'numeral';
import debug from 'debug';
import arrayunion from 'array-union'; // generates new array by splicing 2 arrays and removing duplicates
import rfdc from 'rfdc';

import initialValidateAccounts from './initialValidateAccounts.js';
import assetsToTxAccts from './assetsToTxAccts.js';
import standardize from './standardize.js';
import splits from './splits.js';
import assertAllAccounts from './assertAllAccounts.js';
import validateBalances from './validateBalances.js';
import separateTaxMkt from './separateTaxMkt.js';
import { ledger2Str, line2Str } from './util.js';
import { MultiError } from '../err.js';
import { 
  JSONSchema8, 
  categorySchemas, 
  validateNoteSchemaForCatgory, 
  validateNotesAllSchemas,
  validateNoOneLevelCategories,
} from './postValidation.js';

import {
  Account,
  assertAccount,
  AccountSettings,
  assertAccountSettings,
  AccountTx,
  assertAccountTx,
  CompositeAccount,
  assertCompositeAccount,
  FinalAccounts,
  assertFinalAccounts,
  RawSheetAccount,
  ValidatedRawSheetAccount,
  ValidatedRawTx,
  StatusFunction,
} from './types.js';

export { 
  // Exported types:
  RawSheetAccount, ValidatedRawSheetAccount, AccountSettings, assertAccountSettings,
  Account, assertAccount, AccountTx, assertAccountTx, ValidatedRawTx,
  CompositeAccount, assertCompositeAccount, FinalAccounts, assertFinalAccounts,
  MultiError, JSONSchema8,

  // Exported individual functions to make them individually testable
  initialValidateAccounts, assetsToTxAccts, standardize, 
  splits, assertAllAccounts, validateBalances, separateTaxMkt,
  validateNoteSchemaForCatgory, categorySchemas, validateNotesAllSchemas,
  validateNoOneLevelCategories,

  // Helper functions
  ledger2Str, line2Str,
};

const deepclone = rfdc({proto: true}); // need proto:true for moment
const info = debug('af/accounts:info');
const { magenta, red } = chalk;


function totalSummaryStr(accts: { lines: any[] }[]) {
  const numlines = accts.reduce((sum,a) => sum+a.lines.length,0)
  const numaccts = accts.length;
  return `starting with ${numeral(numlines).format('0,0')} total lines in ${numaccts} accounts`;
} function finalSummaryStr(f: FinalAccounts & { errors?: string[] }) { return `Final: (Tax: ${numeral(f.tax.lines.length).format('0,0')} lines in ${f.tax.accts.length} accounts), `
        +       `(Mkt: ${numeral(f.mkt.lines.length).format('0,0')} lines in ${f.mkt.accts.length} accounts), `
        +       `with ${numeral(f.errors?.length).format('0,0')} errors`;
}


function throwIfErrors(accts: { errors?: string[] }[]) {
  let allerrs = [] as string[];
  for (const acct of accts) {
    if (acct.errors) allerrs.push(...acct.errors);
  }
  if (allerrs.length > 0) {
    throw new MultiError({ msg: allerrs });
  }
}

// If there are any errors on any of the lines, promote them 
// up to the main account's errors.
function promoteLineErrorsToAcct(accts: ValidatedRawSheetAccount[]): ValidatedRawSheetAccount[] {
  for (const acct of accts) {
    let foundone = false;
    for (const line of acct.lines) {
      if (line.errors) {
        foundone = true;
        if (!acct.errors) acct.errors = [];
        acct.errors.push(...line.errors);
      }
    }
    if (foundone) {
      if (!acct.errors) acct.errors = []; // pointless, for TS to be happy
      acct.errors = arrayunion(acct.errors) as string[];
    }
  }
  return accts;
}

function errorsOrNull(items: {errors?: string[], [key: string]: any}[]): string[] | null {
  if (!items) return null;
  let errors: string[] = [];
  for (const i of items) {
    if (i.errors) errors = [ ...errors, ...i.errors ];
  }
  if (errors.length > 0) return errors;
  return null;
}

//--------------------------------------
// rawaccts should be an array of all the sheet_to_json lines from the raw account file
// status is a callback we'll call periodically to update the user what's going on
//--------------------------------------
// You can for loop over the returned async generator to get intermediate results outside
// this library (for react-based display, debugging, etc.)
// If you don't want them, just to an empty for loop with it.
type Steps = 'start' | 
  'initialValidateAccounts' | 
  'assetsToTxAccts' | 
  'standardize' | 
  'splits' | 
  'assertAllAccounts' | 
  'validateBalances' | 
  'separateTaxMkt';

export type StepResult = {
  step: Steps,
  errors?: string[] | null,
  vaccts?: ValidatedRawSheetAccount[] | null,
  accts?: Account[] | null,
  final?: FinalAccounts | null,
  done?: true,
};

export async function* loadInSteps(
  { rawaccts, status=null }:
  { rawaccts: RawSheetAccount[], status?: ((msg: string)=>any) | null }
): AsyncGenerator<StepResult> {
  if (!status) status = info; // default to info from debug
  try {
    rawaccts = deepclone(rawaccts);
  
    // Get account settings, validate account types, column names, etc.
    status(magenta('******** initialValidateAccounts ********'));
    let validrawaccts = initialValidateAccounts({rawaccts, status});
    validrawaccts = promoteLineErrorsToAcct(validrawaccts);
    yield { 
      step: 'initialValidateAccounts',
      errors: errorsOrNull(validrawaccts),
      vaccts: validrawaccts,
    };
  
    status(magenta(`********        assets        ********: ${totalSummaryStr(validrawaccts)}`));
    validrawaccts = assetsToTxAccts({accts: validrawaccts}) // Convert all asset accounts to regular TX accounts
    validrawaccts = promoteLineErrorsToAcct(validrawaccts);
    yield { 
      step: 'assetsToTxAccts',
      errors: errorsOrNull(validrawaccts),
      vaccts: validrawaccts,
    };
  
    status(magenta(`********     standardize      ********: ${totalSummaryStr(validrawaccts)}`));
    validrawaccts = standardize({ accts: validrawaccts, status }); // All the lines have consistent fields now
    validrawaccts = promoteLineErrorsToAcct(validrawaccts);
    yield { 
      step: 'standardize',
      errors: errorsOrNull(validrawaccts),
      vaccts: validrawaccts,
    };
  
    status(magenta(`********        splits        ********: ${totalSummaryStr(validrawaccts)}`));
    validrawaccts = splits({ accts: validrawaccts, status });      // replaces split master lines with individual split counterparts below it
    validrawaccts = promoteLineErrorsToAcct(validrawaccts);
    yield { 
      step: 'splits',
      errors: errorsOrNull(validrawaccts),
      vaccts: validrawaccts,
    };
    throwIfErrors(validrawaccts);
  
    status(magenta(`********  assertAllAccounts  ********: ${totalSummaryStr(validrawaccts)}`));
    let accts: Account[] | null = null;
    let errors: string[] | null = null;
    try {
      accts = assertAllAccounts({ accts: validrawaccts });
    } catch(e: any) {
      e = MultiError.wrap(e, `Failed to assert all accounts`);
      errors = e.msgs();
    }
    yield {
      step: 'assertAllAccounts',
      errors,
      accts,
      vaccts: validrawaccts,
    };
    if (!accts || errors && errors.length > 0) {
      throw new MultiError({ msg: errors || `Accts is null after assertAllAccounts!` });
    }

    // We lose the ability to include errors in the account itself once it is an Account,
    // so they get passed back separately now.
    status(magenta(`********   validateBalances   ********: ${totalSummaryStr(accts)}`));
    let res = validateBalances({accts});
    yield {
      step: 'validateBalances',
      errors: res.errors,
      accts: res.accts,
    }
    // If balances are screwed up, then we can't get anything meaningful out of
    // separateTaxMkt.  Therefore, throw here if we have any errors.
    if (res.errors && res.errors.length > 0) {
      throw new MultiError({ msg: res.errors })
    }
    accts = res.accts;
  
    status(magenta(`********     separateTaxMkt   ********: ${totalSummaryStr(accts)}`));
    let finalaccts;
    try {
      finalaccts = separateTaxMkt({accts,status}) // returns { tax: { lines, accts }, mkt: { lines, accts }, errors: [] }
    } catch(e: any) {
      e = MultiError.wrap(e, `Failed to separate out tax/mkt accounts`);
      errors = e.msgs();
      yield {
        step: 'separateTaxMkt',
        errors,
        accts
      };
      throw e;
    }

    status(magenta(`********       finished       ********: ${finalSummaryStr(finalaccts)}`));
    yield {
      step: 'separateTaxMkt',
      final: finalaccts,
      done: true,
    }
    return; // make sure function ends here

  } catch(e: any) {
    e = MultiError.wrap(e, `Accounts failed to load`);
    info(red(e.msgs().join('\n')));
    throw e;
  }
};

export async function loadAll(
  { rawaccts, status=null }:
  { rawaccts: RawSheetAccount[], status: StatusFunction | null },
): Promise<FinalAccounts | null> {

  const steps = loadInSteps({ rawaccts, status });
  let step;
  for await (step of steps) { /* Just go through all steps... */ }
  if (!step || !step.done || typeof step.final === 'undefined') {
    if (step?.errors && step.errors.length > 0) throw new MultiError({ msg: step.errors });
    throw new MultiError({ msg: 'Did not finish all the steps, but had no reported errors' });
  }
  return step.final; // should be the final acccounts
}

