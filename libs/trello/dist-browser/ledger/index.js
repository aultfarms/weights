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
import { categorySchemas, validateNoteSchemaForCatgory, validateNotesAllSchemas, validateNoOneLevelCategories, } from './postValidation.js';
import { assertAccount, assertAccountSettings, assertAccountTx, assertCompositeAccount, assertFinalAccounts, } from './types.js';
//import type {argv0} from 'process';
export { accountToWorkbook } from './exporter.js';
// if you have an account that you change, you can use this to fix the balances:
export { recomputeBalances } from './sortAndSeparateTaxMkt.js';
export { assertAccountSettings, assertAccount, assertAccountTx, assertCompositeAccount, assertFinalAccounts, MultiError, 
// Exported individual functions to make them individually testable
initialValidateAccounts, assetsToTxAccts, standardize, splits, assertAllAccounts, validateBalances, sortAndSeparateTaxMkt, validateNoteSchemaForCatgory, categorySchemas, validateNotesAllSchemas, validateNoOneLevelCategories, 
// Helper functions
ledger2Str, line2Str, };
const deepclone = rfdc({ proto: true }); // need proto:true for moment
const info = debug('af/accounts:info');
const { magenta, red } = chalk;
function totalSummaryStr(accts) {
    const numlines = accts.reduce((sum, a) => sum + a.lines.length, 0);
    const numaccts = accts.length;
    return `starting with ${numeral(numlines).format('0,0')} total lines in ${numaccts} accounts`;
}
function finalSummaryStr(f) {
    return `Final: (Tax: ${numeral(f.tax.lines.length).format('0,0')} lines in ${f.tax.accts.length} accounts), `
        + `(Mkt: ${numeral(f.mkt.lines.length).format('0,0')} lines in ${f.mkt.accts.length} accounts), `
        + `with ${numeral(f.errors?.length).format('0,0')} errors`;
}
function throwIfErrors(accts) {
    let allerrs = [];
    if (!accts) {
        throw new MultiError({ msg: 'accts is undefined' });
    }
    for (const acct of accts) {
        if (acct.errors)
            allerrs.push(...acct.errors);
    }
    if (allerrs.length > 0) {
        throw new MultiError({ msg: allerrs });
    }
}
// If there are any errors on any of the lines, promote them 
// up to the main account's errors.
function promoteLineErrorsToAcct(accts) {
    for (const acct of accts) {
        let foundone = false;
        for (const line of acct.lines) {
            if (line.errors) {
                foundone = true;
                if (!acct.errors)
                    acct.errors = [];
                acct.errors.push(...line.errors);
            }
        }
        if (foundone) {
            if (!acct.errors)
                acct.errors = []; // pointless, for TS to be happy
            acct.errors = arrayunion(acct.errors);
        }
    }
    return accts;
}
function errorsOrNull(items) {
    if (!items)
        return null;
    let errors = [];
    for (const i of items) {
        if (i.errors)
            errors = [...errors, ...i.errors];
    }
    if (errors.length > 0)
        return errors;
    return null;
}
let stepnum = 0;
const stepToOrderNumber = {
    start: stepnum++,
    initialValidateAccounts: stepnum++,
    assetsToTxAccts: stepnum++,
    standardize: stepnum++,
    splits: stepnum++,
    assertAllAccounts: stepnum++,
    validateBalances: stepnum++,
    sortAndSeparateTaxMkt: stepnum++,
};
export async function* loadInSteps({ rawaccts, validrawaccts, accts, status = null, startingStep = 'start' }) {
    if (!status)
        status = info; // default to info from debug
    if (!startingStep)
        startingStep = 'start';
    try {
        rawaccts = deepclone(rawaccts);
        let step = stepToOrderNumber[startingStep];
        if (step === stepToOrderNumber['start'])
            step++; // step "0" doesn't exist really, so start on step 1
        // Get account settings, validate account types, column names, etc.
        if (step <= stepToOrderNumber['initialValidateAccounts']) {
            try {
                status(magenta('******** initialValidateAccounts ********'));
                if (!rawaccts)
                    throw new MultiError({ msg: 'no rawaccts passed for initialValidateAccounts to work on' });
                validrawaccts = initialValidateAccounts({ rawaccts, status });
                validrawaccts = promoteLineErrorsToAcct(validrawaccts);
                yield {
                    step: 'initialValidateAccounts',
                    errors: errorsOrNull(validrawaccts),
                    vaccts: validrawaccts,
                };
            }
            catch (e) {
                throw MultiError.wrap(e, 'Accounts failed initialValidateAccounts');
            }
            step++;
        }
        if (step <= stepToOrderNumber['assetsToTxAccts']) {
            if (!validrawaccts) {
                throw new MultiError({ msg: 'No validrawaccts returned from initialValidateAccounts' });
            }
            try {
                status(magenta(`********        assets        ********: ${totalSummaryStr(validrawaccts)}`));
                validrawaccts = assetsToTxAccts({ accts: validrawaccts }); // Convert all asset accounts to regular TX accounts
                validrawaccts = promoteLineErrorsToAcct(validrawaccts);
                yield {
                    step: 'assetsToTxAccts',
                    errors: errorsOrNull(validrawaccts),
                    vaccts: validrawaccts,
                };
            }
            catch (e) {
                throw MultiError.wrap(e, 'Accounts failed assetsToTxAccts');
            }
            step++;
        }
        if (step <= stepToOrderNumber['standardize']) {
            if (!validrawaccts) {
                throw new MultiError({ msg: 'No validrawaccts returned from assetsToTxAccts' });
            }
            try {
                status(magenta(`********     standardize      ********: ${totalSummaryStr(validrawaccts)}`));
                validrawaccts = standardize({ accts: validrawaccts, status }); // All the lines have consistent fields now
                validrawaccts = promoteLineErrorsToAcct(validrawaccts);
                yield {
                    step: 'standardize',
                    errors: errorsOrNull(validrawaccts),
                    vaccts: validrawaccts,
                };
            }
            catch (e) {
                throw MultiError.wrap(e, 'Accounts failed standardize');
            }
            step++;
        }
        if (step <= stepToOrderNumber['splits']) {
            if (!validrawaccts) {
                throw new MultiError({ msg: 'No validrawaccts returned from standardize' });
            }
            try {
                status(magenta(`********        splits        ********: ${totalSummaryStr(validrawaccts)}`));
                validrawaccts = splits({ accts: validrawaccts, status }); // replaces split master lines with individual split counterparts below it
                validrawaccts = promoteLineErrorsToAcct(validrawaccts);
                yield {
                    step: 'splits',
                    errors: errorsOrNull(validrawaccts),
                    vaccts: validrawaccts,
                };
            }
            catch (e) {
                throw MultiError.wrap(e, 'Accounts failed splits');
            }
            step++;
        }
        if (step <= stepToOrderNumber['assertAllAccounts']) {
            throwIfErrors(validrawaccts);
            status(magenta(`********  assertAllAccounts  ********: ${totalSummaryStr(validrawaccts)}`));
            let errors = null;
            try {
                accts = assertAllAccounts({ accts: validrawaccts });
            }
            catch (e) {
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
            let res = validateBalances({ accts });
            yield {
                step: 'validateBalances',
                errors: res.errors,
                accts: res.accts,
            };
            // If balances are screwed up, then we can't get anything meaningful out of
            // sortAndSeparateTaxMkt.  Therefore, throw here if we have any errors.
            if (res.errors && res.errors.length > 0) {
                throw new MultiError({ msg: res.errors });
            }
            accts = res.accts;
            step++;
        }
        // IMPORTANT: at this point, the lines have NOT been sorted by date.  They are in the order
        // that the account spreadsheet had them.  When we look for account balances as of a date, we
        // grab the last entry on that day.  Therefore, we have to sort all the lines by date in all the
        // accounts and recompute the balances in order for them to be correct.  We do that in sortAndSeparateTaxMkt
        let finalaccts = null;
        if (step <= stepToOrderNumber['sortAndSeparateTaxMkt']) {
            if (!accts) {
                throw new MultiError({ msg: 'Accts is null after validateBalances' });
            }
            status(magenta(`********     sortAndSeparateTaxMkt   ********: ${totalSummaryStr(accts)}`));
            try {
                finalaccts = sortAndSeparateTaxMkt({ accts, status }); // returns { tax: { lines, accts }, mkt: { lines, accts }, errors: [] }
            }
            catch (e) {
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
        };
        return; // make sure function ends here
    }
    catch (e) {
        e = MultiError.wrap(e, `Accounts failed to load`);
        info(red(e.msgs().join('\n')));
        throw e;
    }
}
;
export async function loadAll({ rawaccts, validrawaccts, accts, status = null, startingStep = 'start' }) {
    const steps = loadInSteps({ rawaccts, status, validrawaccts, accts, startingStep });
    let step;
    for await (step of steps) { /* Just go through all steps... */ }
    if (!step || !step.done || typeof step.final === 'undefined') {
        if (step?.errors && step.errors.length > 0)
            throw new MultiError({ msg: step.errors });
        throw new MultiError({ msg: 'Did not finish all the steps, but had no reported errors' });
    }
    return step.final; // should be the final acccounts
}
//# sourceMappingURL=index.js.map