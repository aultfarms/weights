import type { ledger } from '../index.js';
import { testacct, testacctWithSettings, testacctAsset } from './samples.js';
import debug from 'debug';
import deepequal from 'deep-equal';
import rfdc from 'rfdc';
import moment from 'moment';

const deepclone = rfdc();
// TESTS TO ADD:
// - make sure asset transaction origin lines are sorted ascending by date (grab origin lines off the final tx lines)

const { isMoment } = moment;
const info = debug('af/accounts#test/ledger:info');
//const silent = () => {};

export default async function run(a: typeof ledger, rawaccts: ledger.RawSheetAccount[]) {
  if (rawaccts.length < 1) throw `You did not pass any accoutns to test.`;
  // Test all the individual parts with simple accounts before running the big set:
  info('testing initialValidateAccounts');
  testInitialValidateAccounts(a);
  info('testing assetsToTxAccts');
  testAssetsToTxAccts(a);
  info('testing standardize');
  testStandardize(a);
  info('testing splits');
  testSplits(a);
  info('testing assertAllAccounts');
  testAssertAllAccounts(a);
  info('testing validateBalances');
  testValidateBalanaces(a);
  info('testing sortAndSeparateTaxMkt');
  testSeparateTaxMkt(a);
  info('testing loadInSteps');  
  await testLoadInSteps(a, rawaccts);
}

function basicVerify(
  r: ledger.ValidatedRawSheetAccount | undefined, 
  orig?: ledger.RawSheetAccount | ledger.ValidatedRawSheetAccount,
  settings?: ledger.AccountSettings
): void {
  if (!r) throw `null result`;
  if (r.errors && r.errors.length > 0) throw `Account returned errors: ${r.errors.join('\n')}`;
  if (settings) {
    if (!deepequal(r.settings, settings)) throw `Account settings (${JSON.stringify(r.settings)}) do not match expected (${JSON.stringify(settings)})`;
  }
  // Validate all the lines: should have lineno, should leave dates alone, numbers should be numbers
  if (!r?.lines) throw `Account has no lines`;
  for (const l of r.lines) {
    if (!l.lineno) throw `Line has no lineno`;
    // postDate, writtenDate, or date, if they exist, should be strings or moments:
    for (const d of [ 'postDate', 'writtenDate', 'date' ]) {
      if (d in l && l[d] !== null) {
        if (typeof l[d] !== 'string' && !isMoment(l[d])) {
          throw `${d} (${l[d]}) on the line is not a string or a Moment`;
        }
        if (typeof l[d] === 'string') {
          if (!l[d].match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
            throw `${d} (${l[d]}) on the line is a string, but it is not a valid date string`;
          }
        }
      }
    }

    // amount, debit, credit, balance should all be numbers
    for (const n of [ 'amount', 'debit', 'credit', 'balance' ]) {
      if (n in l && n !== null) {
        if (typeof l[n] !== 'number' || isNaN(l[n])) {
          throw `${n} (${l[n]}) on line is not a number`
        }
      }
    }

    // Make sure the catetory, description, and who stick around from original
    if (orig) {
      for (const s of [ 'category', 'description', 'who' ]) {
        if (s in orig.lines[l.lineno-2]) {
          if (l[s] !== orig.lines[l.lineno-2][s]) {
            throw `${s} exists in original line ${l.lineno-2} (${JSON.stringify(orig.lines[l.lineno-2])}), but not in final (${JSON.stringify(l)})`;
          }
        }
      }
    }

  }

}

function testInitialValidateAccounts(a: typeof ledger): void {
  info('It should work on the test cash account');
  let clean = deepclone(testacct);
  let res = a.initialValidateAccounts({ rawaccts: [ clean ], status: () => {}});
  basicVerify(res[0], testacct, { 'accounttype': 'cash' });
  if (res.length !== 1) throw `Only sent in one account, but got bat ${res.length} accounts`;
  info('passed initialValidateAccounts test cash account');

  info('It should work on the test account with settings');
  clean = deepclone(testacctWithSettings);
  res = a.initialValidateAccounts({ rawaccts: [ clean ], status: () => {}});
  basicVerify(res[0], testacctWithSettings, { accounttype: 'cash', balancetype: 'inverted' });
  if (res.length !== 1) throw `Only sent in one account, but got bat ${res.length} accounts`;
  info('passed initialValidateAccounts test account with settings');

  info('It should work on the test asset account');
  clean = deepclone(testacctAsset);
  res = a.initialValidateAccounts({ rawaccts: [ clean ], status: () => {}});
  basicVerify(res[0], testacctAsset, { accounttype: 'asset', asOfDate: '2020-12-31', priorDate: '2019-12-31' });
  if (res.length !== 1) throw `Only sent in one account, but got bat ${res.length} accounts`;
  info('passed initialValidateAccounts test asset account');

  info('It should eliminate an "empty" line that has a few columns as empty strings');
  clean = deepclone(testacct);
  clean.lines.push({ "emptykey": "" });
  const lineindex = clean.lines.length-1;
  res = a.initialValidateAccounts({ rawaccts: [ clean ], status: () => {}});
  if (res?.[0]?.lines) {
    const hasemptyline = res[0].lines.find(l => l.emptykey === "");
    const haslineno = res[0].lines.find(l => l.lineno === lineindex+2);
    if (hasemptyline) throw `Found line in result with emptykey, it should have been removed as an empty line`;
    if (haslineno) throw `Found line in result with lineno of the emptykey line, it should have been removed`;
  }
  info('passed initialValidateAccounts eliminate empty lines');
}


function testAssetsToTxAccts(a: typeof ledger): void {
  let clean = deepclone(testacctAsset);
  info('It should not throw with the test asset account, and have no errors');
  // need to validate the samples first
  let accts = a.initialValidateAccounts({ rawaccts: [ clean ], status: () => {}});
  let res = a.assetsToTxAccts({ accts });
  if (!res || !res[0]) throw `assetsToTxAccts returned null or no accounts`;
  if (res[0].errors && res[0].errors.length > 0) throw `Account had errors: ${res[0].errors.join('\n')}`;
  if (res.length !== 1) throw `assetsToTxAccts should have only returned 1 asset account, instead it returned ${res.length} with names ${res.map(a => a.name).join(', ')}`;
  info('passed assetsToTxAccts on test asset account');

  info('It should not mess with a cash account');
  clean = deepclone(testacct);
  accts = a.initialValidateAccounts({ rawaccts: [ clean ], status: () => {}});
  res = a.assetsToTxAccts({ accts });
  if (!res || !res[0]) throw `assetsToTxAccts returned null or no accounts`;
  if (res[0].errors && res[0].errors.length > 0) throw `Account had errors: ${res[0].errors.join('\n')}`;
  if (res.length !== 1) throw `assetsToTxAccts should have only returned 1 cash account, instead it returned ${res.length} with names ${res.map(a => a.name).join(', ')}`;
  if (!deepequal(accts, res)) throw `assetsToTxAccts changed the cash account and it should have left it alone`;
  info('passed assetsToTxAccts leaving cash account alone');
}

function testStandardize(a: typeof ledger): void {
  const clean = deepclone(testacct);
  info('It should not throw with the test cash account, and have no errors');
  let accts1 = a.initialValidateAccounts({ rawaccts: [ clean ], status: () => {} });
  let accts2 = a.assetsToTxAccts({ accts: accts1 });
  let res = a.standardize({ accts: accts2, status: () => {}});
  basicVerify(res[0], testacct);
  if (!res[0]) throw `No test account 0 (TS error)`;
  info('passed no errors on test cash account');

  info('It should have correct answers in the actual processed lines');
  // Now check that things really got standardized properly...
  const lines = res[0].lines;
  if (lines[0]?.description !== 'START' && !lines[0]?.isStart) throw `First line is not start`;
  if (lines[1]?.amount !== -100_000) throw `Second line amount (${lines[1]?.amount}) not properly derived from debit`;
  if (!lines[3] || 
      !lines[3].note || 
      typeof lines[3].note !== 'object' || 
      !('gallons' in lines[3].note) ||
      lines[3].note.gallons !== 400
  ) {
    throw `Last line note (${lines[3]?.note}) did not parse into an object properly`;
  }
  info('passed correct answers in lines');
}

function testSplits(a: typeof ledger) {
  const clean = deepclone(testacct);
  info('It should not throw with the test cash account, and have no errors');
  let accts1 = a.initialValidateAccounts({ rawaccts: [ clean ], status: () => {} });
  let accts2 = a.assetsToTxAccts({ accts: accts1 });
  let accts3 = a.standardize({ accts: accts2, status: () => {}});
  let res = a.splits({ accts: accts3, status: () => {} });
  // Now check that the split lines from the original are properly converted
  let lines = res[0]?.lines || [];
  if (lines.length < 0) throw `No lines returned from splits`;
  if (lines.find(l => l.category === 'SPLIT')) throw `There is still a line in the result with a category of SPLIT`;
  // Lines 6 and 7 from original were split lines, they are now 5 and 6 (base line 5 should have been removed)
  if (lines.find(l => l.who === 'SPLIT')) throw `There is still a line with 'who' as a SPLIT`;
  // Final balance should be same as original:

  info('It should return an error if the splitAmount is messed up');
  // Try sending it through again, but mess up one of the splitAmounts
  clean.lines[6].splitAmount = "-$4,000.00"; // split amount is wrong
  accts1 = a.initialValidateAccounts({ rawaccts: [ clean ], status: () => {} });
  accts2 = a.assetsToTxAccts({ accts: accts1 });
  accts3 = a.standardize({ accts: accts2, status: () => {}});
  res = a.splits({ accts: accts3, status: () => {} });
  let acct = res[0];
  if (!acct) throw `No account returned from splits on the intentional messed up splitAmount test`;
  if ((acct.errors?.length || 0) < 1) throw `Tested splitAmount was intentionally wrong, but there was not exactly 1 error in result (${acct.errors?.join('\n')})`;
  if (!acct.errors?.find(e => e.match(/LINE: 6/))) throw `Did not find error for line 6 in result`;
  if (!acct.errors?.find(e => e.match(/sum +of +splits/))) throw `Did not find 'sum of splits' error in result`;
  info('passed checking a messed up splitAmount');
}

function testAssertAllAccounts(a: typeof ledger) {
  info('It should pass all assertions on all three sample accounts');
  const accts0 = [ deepclone(testacct), deepclone(testacctWithSettings), deepclone(testacctAsset) ];
  let accts1 = a.initialValidateAccounts({ rawaccts: accts0, status: () => {} });
  let accts2 = a.assetsToTxAccts({ accts: accts1 });
  let accts3 = a.standardize({ accts: accts2, status: () => {}});
  let accts4 = a.splits({ accts: accts3, status: () => {} });
  a.assertAllAccounts({ accts: accts4, status: () => {} });
  info('passed assertion on all sample accounts');  

  info('should fail assertion on un-processed accounts');
  let failed = false;
  try { 
    a.assertAllAccounts({ accts: accts1 })
    failed = true;
  } catch(e) { }
  if (!failed) throw `assertAllAccounts failed to throw on invalid accounts`;
  info('passed assertion on un-processed accounts');
}

function testValidateBalanaces(a: typeof ledger) {
  info('It should validate balances on all sample accounts');
  const accts0 = [ deepclone(testacct), deepclone(testacctWithSettings), deepclone(testacctAsset) ];
  let accts1 = a.initialValidateAccounts({ rawaccts: accts0, status: () => {} });
  let accts2 = a.assetsToTxAccts({ accts: accts1 });
  let accts3 = a.standardize({ accts: accts2, status: () => {}});
  let accts4 = a.splits({ accts: accts3, status: () => {} });
  let accts5 = a.assertAllAccounts({ accts: accts4, status: () => {} });
  let res = a.validateBalances({ accts: accts5 });
  if (res.errors && res.errors.length > 0) {
    throw `Failed to validate balances, errors were returned: ${res.errors.join('\n')}`;
  }
  info('passed balance validation on sample accounts');

  info('It should return error if a balance does not match computed balance');
  let badacct = deepclone(testacct);
  badacct.lines[3].balance = "$0.01";
  accts1 = a.initialValidateAccounts({ rawaccts: [ badacct ], status: () => {} });
  accts2 = a.assetsToTxAccts({ accts: accts1 });
  accts3 = a.standardize({ accts: accts2, status: () => {}});
  accts4 = a.splits({ accts: accts3, status: () => {} });
  accts5 = a.assertAllAccounts({ accts: accts4, status: () => {} });
  res = a.validateBalances({ accts: accts5 });
  if (!res.errors || res.errors.length < 1) {
    throw `Failed to return an error with an invalid balance`;
  }
  info('passed checking for error on intentionally bad balance');
}

function testSeparateTaxMkt(a: typeof ledger) {
  info('It should not error when separating tax/mkt on sample accounts');
  const accts0 = [ deepclone(testacct), deepclone(testacctWithSettings), deepclone(testacctAsset) ];
  let accts1 = a.initialValidateAccounts({ rawaccts: accts0, status: () => {} });
  let accts2 = a.assetsToTxAccts({ accts: accts1 });
  let accts3 = a.standardize({ accts: accts2, status: () => {}});
  let accts4 = a.splits({ accts: accts3, status: () => {} });
  let accts5 = a.assertAllAccounts({ accts: accts4, status: () => {} });
  let accts6 = a.validateBalances({ accts: accts5 });
  let res = a.sortAndSeparateTaxMkt({ accts: accts6.accts, status: () => {} });
  info('passed no errors when separating tax/mkt');

  for (const type of ['tax', 'mkt']) {
    info('%s type should have correct balances', type);
    let sum = 0;
    for (const l of ((res as any)[type] as ledger.Account).lines) {
      sum += l.amount;
      if (sum !== l.balance) {
        throw `Balance did not match computed balance on line ${JSON.stringify(l)}`;
      }
    }
    info('%s type passed correct balances', type);
  }
}

async function testLoadInSteps(a: typeof ledger, rawaccts: ledger.RawSheetAccount[]) { 
  info('It should load all the example spreadsheets without error');
  if (rawaccts.length < 0) throw `You have no RawSheetAccount's to test`;
  // It should return an async generator:
  const steps = a.loadInSteps({ rawaccts, status: () => {}});
  
  // It should let me iterate over that async generator:
  let count = 1;
  let step;
  try {
    for await (step of steps) {
      //info(`Step ${count}: ${step.step}, step = `, step);
      if (!step) throw `Step ${count}: generator returned null`;
      count++;
    }
  } catch(e: any) {
    throw `Steps threw error: ${e}`;
  }
  if (!step || !step.done) {
    throw `Steps did not complete.  step.step = ${step?.step}, step.done = ${step?.done}`;
  }
  
  // For some reason, TS requires you to explicitly write out the type of something
  // that is a property on an object:
  //const assertFinalAccounts: (a:any) => asserts a is ledger.FinalAccounts = a.assertFinalAccounts;
  const assertFinalAccounts: typeof a.assertFinalAccounts = a.assertFinalAccounts;

  assertFinalAccounts(step.final);
  info('passed loading example spreadsheets without error');

  info('It should have the right number of final tax and mkt accounts');
  let accts = step.final.tax.accts;
  if (accts.length !== 24) throw `There should be 24 accounts in final.tax, but there are ${accts.length} instead.  They are: ${accts.map(a=>a.name).join('\n')}`;
  accts = step.final.mkt.accts;
  if (accts.length !== 36) throw `There should be 36 accounts in final.mkt, but there are ${accts.length} instead.  They are: ${accts.map(a=>a.name).join('\n')}`;
  info('passed right number of final tax and mkt accounts');

}
