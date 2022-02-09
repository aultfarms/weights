
import chalk from 'chalk';
import numeral from 'numeral';
import debug from 'debug';

import initialValidateAccounts from './initialValidateAccounts';
import pruneAndNumberize from './pruneAndNumberize';
import assetsToTxAccts from './assetsToTxAccts';
import standardize from './standardize';
import splits from './splits';
import assertAllAccounts from './assertAllAccounts';
import validateBalances from './validateBalances';
import separateTaxMkt from './separateTaxMkt';
import { MultiError } from './err';

import {
  Account,
  assertAccount,
  AccountTx,
  assertAccountTx,
  FinalAccounts, 
  RawSheetAccount 
} from './types';

export { 
  Account, assertAccount, 
  AccountTx, assertAccountTx, 
  FinalAccounts, 
  RawSheetAccount,
  MultiError
};

const info = debug('af/accounts:info');

const { cyan, red } = chalk;


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
    if (acct.errors) allerrs = allerrs.concat(acct.errors);
  }
  if (allerrs.length > 0) {
    throw new MultiError({ msg: allerrs });
  }
}

// rawaccts should be an array of all the sheet_to_json lines from the raw account file
// status is a callback we'll call periodically to update the user what's going on
export default function(
  { rawaccts, status=null }:
  { rawaccts: RawSheetAccount[], status?: ((msg: string)=>any) | null }
): FinalAccounts | null {
  if (!status) status = info; // default to info from debug
  try {
  
    // Get account settings, validate account types, column names, etc.
    status(cyan('******** initialValidateAccounts ********'));
    let validrawaccts = initialValidateAccounts({rawaccts, status});
    throwIfErrors(validrawaccts);
  
    status(cyan(`********        prune         ********: ${totalSummaryStr(validrawaccts)}`));
    pruneAndNumberize({accts: validrawaccts, status}); // get rid of comment, settings, and ignore lines
    throwIfErrors(validrawaccts);
  
    status(cyan(`********        assets        ********: ${totalSummaryStr(validrawaccts)}`));
    validrawaccts = assetsToTxAccts({accts: validrawaccts}) // Convert all asset accounts to regular TX accounts
    throwIfErrors(validrawaccts);
  
    status(cyan(`********     standardize      ********: ${totalSummaryStr(validrawaccts)}`));
    validrawaccts = standardize({ accts: validrawaccts }); // All the lines have consistent fields now
    throwIfErrors(validrawaccts);
  
    status(cyan(`********        splits        ********: ${totalSummaryStr(validrawaccts)}`));
    validrawaccts = splits({ accts: validrawaccts, status });      // replaces split master lines with individual split counterparts below it
    throwIfErrors(validrawaccts);
  
    status(cyan(`******** errorWithoutCategory ********: ${totalSummaryStr(validrawaccts)}`));
    let accts: Account[] = assertAllAccounts({ accts: validrawaccts });
    // assertAllAccounts throws if there are any errors
  
    status(cyan(`********   validateBalances   ********: ${totalSummaryStr(accts)}`));
    let res = validateBalances({accts});
    if (res.errors && res.errors.length > 0) {
      throw new MultiError({ msg: res.errors })
    }
    accts = res.accts;
  
    status(cyan(`********       combine        ********: ${totalSummaryStr(accts)}`));
    const finalaccts = separateTaxMkt({accts}) // returns { tax: { lines, accts }, mkt: { lines, accts }, errors: [] }
    status(cyan(`********       finished       ********: ${finalSummaryStr(finalaccts)}`));
    return finalaccts;
  } catch(e: any) {
    e = MultiError.wrap(e, `Accounts failed to load`);
    status(red(e.msgs().join('\n')));
  }
  return null;
};
