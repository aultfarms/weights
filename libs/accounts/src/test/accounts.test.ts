import type * as accounts from '../index.js';
import ledgerTest from './ledger.test.js';
import profitLossTest from './profitloss.test.js';
import balanceTest from './balance.test.js';
import rfdc from 'rfdc';
import debug from 'debug';

// You need proto: true for moment
const deepclone = rfdc({ proto: true });

const info = debug('af/accounts#test/accounts:info');

export default async function run(a: typeof accounts, rawaccts: accounts.ledger.RawSheetAccount[]) {
  if (rawaccts.length < 1) throw `You did not pass any accounts to test.`;
/*
  info('testing ledger');
  await ledgerTest(a.ledger, deepclone(rawaccts));
*/
  info('testing profit-loss');
  const ledger = await a.ledger.loadAll({ rawaccts: deepclone(rawaccts), status: () => {}});
  if (!ledger) throw `Failed to load ledger, loadAll returned falsey`;
  await profitLossTest(a.profitloss, ledger);

  info('testing balance');
  await balanceTest(a.balance, ledger);

  info('All Account Tests Passed');
}

