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
import sortAndSeparateTaxMkt from './sortAndSeparateTaxMkt.js';
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
//import type {argv0} from 'process';

export { accountToWorkbook } from './exporter.js';

// if you have an account that you change, you can use this to fix the balances:
export { recomputeBalances } from './sortAndSeparateTaxMkt.js'; 

export { 
  // Exported types:
  RawSheetAccount, ValidatedRawSheetAccount, AccountSettings, assertAccountSettings,
  Account, assertAccount, AccountTx, assertAccountTx, ValidatedRawTx,
  CompositeAccount, assertCompositeAccount, FinalAccounts, assertFinalAccounts,
  MultiError, JSONSchema8,

  // Exported individual functions to make them individually testable
  initialValidateAccounts, assetsToTxAccts, standardize, 
  splits, assertAllAccounts, validateBalances, sortAndSeparateTaxMkt,
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


function throwIfErrors(accts: { errors?: string[] }[] | undefined): asserts accts is object[] {
  let allerrs = [] as string[];
  if (!accts) {
    throw new MultiError({ msg: 'accts is undefined' });
  }
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
  'sortAndSeparateTaxMkt';
let stepnum = 0;
const stepToOrderNumber: Record<Steps,number> = { // use this for step1 < step3 kind of things
  start: stepnum++,
  initialValidateAccounts: stepnum++,
  assetsToTxAccts: stepnum++,
  standardize: stepnum++,
  splits: stepnum++,  
  assertAllAccounts: stepnum++,  
  validateBalances: stepnum++,  
  sortAndSeparateTaxMkt: stepnum++,  
}
export type StepResult = {
  step: Steps,
  errors?: string[] | null,
  vaccts?: ValidatedRawSheetAccount[] | null,
  accts?: Account[] | null,
  final?: FinalAccounts | null,
  done?: true,
};

export async function* loadInSteps(
  { rawaccts, validrawaccts, accts, status=null, startingStep='start' }:
  { rawaccts?: RawSheetAccount[],  // if startingStep is prior to initialValidateAccounts
    validrawaccts?: ReturnType<typeof initialValidateAccounts>, // after initialValidateAccounts but before validateBalances
    accts?: Account[], // anything from validateBalances forward
    status?: ((msg: string)=>any) | null, 
    startingStep?: Steps 
  }
): AsyncGenerator<StepResult> {
  if (!status) status = info; // default to info from debug
  if (!startingStep) startingStep = 'start';
  try {
    rawaccts = deepclone(rawaccts);
    let step: number = stepToOrderNumber[startingStep];
    if (step === stepToOrderNumber['start']) step++; // step "0" doesn't exist really, so start on step 1
  
    // Get account settings, validate account types, column names, etc.
    if (step <= stepToOrderNumber['initialValidateAccounts']) {
      try {
        status(magenta('******** initialValidateAccounts ********'));
        if (!rawaccts) throw new MultiError({ msg: 'no rawaccts passed for initialValidateAccounts to work on' });
        validrawaccts = initialValidateAccounts({rawaccts, status});
        validrawaccts = promoteLineErrorsToAcct(validrawaccts);
        yield { 
          step: 'initialValidateAccounts',
          errors: errorsOrNull(validrawaccts),
          vaccts: validrawaccts,
        };
      } catch (e: any) {
        throw MultiError.wrap(e, 'Accounts failed initialValidateAccounts');
      }
      step++;
    }

    if (step <= stepToOrderNumber['assetsToTxAccts']) {
      if (!validrawaccts) { throw new MultiError({ msg: 'No validrawaccts returned from initialValidateAccounts' }) }
      try {
        status(magenta(`********        assets        ********: ${totalSummaryStr(validrawaccts)}`));
        validrawaccts = assetsToTxAccts({accts: validrawaccts}) // Convert all asset accounts to regular TX accounts
        validrawaccts = promoteLineErrorsToAcct(validrawaccts);
        yield { 
          step: 'assetsToTxAccts',
          errors: errorsOrNull(validrawaccts),
          vaccts: validrawaccts,
        };
      } catch(e: any) {
        throw MultiError.wrap(e, 'Accounts failed assetsToTxAccts');
      }
      step++;
    }

    if (step <= stepToOrderNumber['standardize']) {
      if (!validrawaccts) { throw new MultiError({ msg: 'No validrawaccts returned from assetsToTxAccts' }); }
      try {
        status(magenta(`********     standardize      ********: ${totalSummaryStr(validrawaccts)}`));
        validrawaccts = standardize({ accts: validrawaccts, status }); // All the lines have consistent fields now
        validrawaccts = promoteLineErrorsToAcct(validrawaccts);
        yield { 
          step: 'standardize',
          errors: errorsOrNull(validrawaccts),
          vaccts: validrawaccts,
        };
      } catch (e: any) {
        throw MultiError.wrap(e, 'Accounts failed standardize');
      }
      step++;
    }
      
    if (step <= stepToOrderNumber['splits']) {
      if (!validrawaccts) { throw new MultiError({ msg: 'No validrawaccts returned from standardize' }); }
      try {
        status(magenta(`********        splits        ********: ${totalSummaryStr(validrawaccts)}`));
        validrawaccts = splits({ accts: validrawaccts, status });      // replaces split master lines with individual split counterparts below it
        validrawaccts = promoteLineErrorsToAcct(validrawaccts);
        yield { 
          step: 'splits',
          errors: errorsOrNull(validrawaccts),
          vaccts: validrawaccts,
        };
      } catch (e: any) {
        throw MultiError.wrap(e, 'Accounts failed splits');
      }
      step++;
    }

    if (step <= stepToOrderNumber['assertAllAccounts']) {
      throwIfErrors(validrawaccts);
  
      status(magenta(`********  assertAllAccounts  ********: ${totalSummaryStr(validrawaccts)}`));
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
      step++;
    }

    if (step <= stepToOrderNumber['validateBalances']) {
      if (!accts) {
        throw new MultiError({ msg: `Accts is null after assertAllAccounts!` });
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
      // sortAndSeparateTaxMkt.  Therefore, throw here if we have any errors.
      if (res.errors && res.errors.length > 0) {
        throw new MultiError({ msg: res.errors })
      }
      accts = res.accts;
      step++;
    }

    // IMPORTANT: at this point, the lines have NOT been sorted by date.  They are in the order
    // that the account spreadsheet had them.  When we look for account balances as of a date, we
    // grab the last entry on that day.  Therefore, we have to sort all the lines by date in all the
    // accounts and recompute the balances in order for them to be correct.  We do that in sortAndSeparateTaxMkt
 
    let finalaccts: FinalAccounts | null = null;
    if (step <= stepToOrderNumber['sortAndSeparateTaxMkt']) {
      if (!accts) {
        throw new MultiError({ msg: 'Accts is null after validateBalances' });
      }
      status(magenta(`********     sortAndSeparateTaxMkt   ********: ${totalSummaryStr(accts)}`));
      try {
        finalaccts = sortAndSeparateTaxMkt({accts,status}) // returns { tax: { lines, accts }, mkt: { lines, accts }, errors: [] }
      } catch(e: any) {
        e = MultiError.wrap(e, `Failed to separate out tax/mkt accounts`);
        yield {
          step: 'sortAndSeparateTaxMkt',
          errors: e.msgs(),
          accts
        };
        throw e;
      }
      // Save the original account for inventory to mess around with as needed
      finalaccts.originals = accts;
      step++;
    }

    if (!finalaccts) {
      throw new MultiError({ msg: 'finalaccts is null after sortAndSeparateTaxMkt' });
    }
    status(magenta(`********       Done reading accounts       ********: ${finalSummaryStr(finalaccts)}`));
    yield {
      step: 'sortAndSeparateTaxMkt',
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
  { rawaccts, validrawaccts, accts, status=null, startingStep='start' }:
  { rawaccts?: RawSheetAccount[], 
    validrawaccts?: ReturnType<typeof initialValidateAccounts>,
    accts?: Account[],
    status: StatusFunction | null, 
    startingStep?: Steps 
  },
): Promise<FinalAccounts | null> {

  const steps = loadInSteps({ rawaccts, status, validrawaccts, accts, startingStep });
  let step;
  for await (step of steps) { 
    /* Just go through all steps... */ 
  }
  if (!step || !step.done || typeof step.final === 'undefined') {
    if (step?.errors && step.errors.length > 0) throw new MultiError({ msg: step.errors });
    throw new MultiError({ msg: 'Did not finish all the steps, but had no reported errors' });
  }
  return step.final; // should be the final acccounts
}

// Use this when you update a sheet in Google from inventory and you need to 
// just reload a small number of sheets.  This will first standardize all the
// stuff in the new sheet, then just do the final steps for everything to get
// the final tax/mkt.
// Accounts are replaced in finalaccts.originals by the name on the account
export async function reloadSomeAccounts(
  { rawaccts, finalaccts, status=null }:
  { rawaccts: RawSheetAccount[],
    finalaccts: FinalAccounts,
    status: StatusFunction | null
  }
): Promise<FinalAccounts | null> {
  let steps = loadInSteps({ rawaccts, status }); 
  let newaccts: Account[] = [];
  for await (const step of steps) {
    if (!step) throw new MultiError({ msg: 'Failed to reprocess accounts, step result was falsey' });
    const nextstep = stepToOrderNumber[step.step] + 1;
    // If the next step is sortAndSeparateTaxMkt, then this part of loading is done and
    // its time to break out and put all the accounts back together
    if (nextstep === stepToOrderNumber['sortAndSeparateTaxMkt']) {
      if (!step.accts) {
        throw new MultiError({ msg: 'ERROR: accts was falsey after all steps prior to sortAndSeparateTaxMkt when reprocessing accounts' });
      }
      newaccts = step.accts;
      break; // this will stop the async generator
    }
  }

  const accts: Account[] = finalaccts.originals.map(a => {
    const n = newaccts.find(na => na.name === a.name);
    if (n) return n;
    return a;
  });

  steps = loadInSteps({ accts, status, startingStep: 'sortAndSeparateTaxMkt' });  
  let step;
  for await (step of steps) { 
    /* Just go through all steps, should just be one... */ 
  }
  if (!step || !step.done || typeof step.final === 'undefined') {
    if (step?.errors && step.errors.length > 0) throw new MultiError({ msg: step.errors });
    throw new MultiError({ msg: 'Did not finish all the steps, but had no reported errors' });
  }
  return step.final; // should be the final acccounts
}

