import type { balance, ledger } from '../index.js';
import debug from 'debug';

const info = debug('af/accounts#test/ledger:info');

export default async function run(a: typeof balance, accounts: ledger.FinalAccounts) {

  info('testing loading annualBalanceSheet');

  const mkt = await a.annualBalanceSheet({ ledger: accounts, type: 'mkt', year: 2020 });
  const tax = await a.annualBalanceSheet({ ledger: accounts, type: 'tax', year: 2020 });

  if (!mkt) throw `annualBalanceSheet returned falsey for mkt`;
  if (!tax) throw `annualBalanceSheet returned falsey for tax`;

  // Should have yearend and 4 quarters
  if (!mkt.yearend) throw `Did not have yearend on mkt`;
  if (!tax.yearend) throw `Did not have yearend on tax`;
  if (mkt.quarters?.length !== 4) throw `Did not have 4 quarters on mkt`;
  if (tax.quarters?.length !== 4) throw `Did not have 4 quarters on tax`;

  info('passed loading annualBalanceSheet');

  info('testing some expected category values from annualBalanceSheet');

  const expected = [
    { abs: mkt, accountName: 'loan-bankfixed.loan1', value: -970000 },
    { abs: tax, accountName: 'bank.creditcards', value: 0 },
    { abs: tax, accountName: 'land-test1-taxonly0', value: 4000 },
    { abs: mkt, accountName: 'equipment-loader-2010.nh.skidsteer', value: 0 }, // a "sold" asset that still had mkt value
  ];
  for (const expect of expected) {
    if (!expect.abs.yearend)
      throw `There was no yearend on balance sheet for expect on ${expect.accountName}`;
    const bal = a.getAccountBalance({ balanceSheet: expect.abs.yearend, accountName: expect.accountName });
    if (bal === null) 
      throw `balance did not return a ${expect.accountName} balance`;
    if (!a.moneyEquals(bal, expect.value)) 
      throw `balance did not return expected amount (${expect.value}) for ${expect.accountName} (${bal})`;
  }

  info('passed expected values from annualBalanceSheet');

}


