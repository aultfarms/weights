import type { accounts } from '../';
import debug from 'debug';
import deepequal from 'deep-equal';

const info = debug('test/accounts:info');

type Accounts = typeof accounts;


export default async function run(a: Accounts) {
  throw `tests are not yet written`;
  info('here is a use of a to make ts happy', a);
  info('All Accounts Tests Passed');
}
