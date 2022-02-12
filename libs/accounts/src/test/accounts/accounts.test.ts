import type { accounts } from '../../index.js';
import debug from 'debug';

const info = debug('test/accounts:info');

type Accounts = typeof accounts;

export default async function run(a: Accounts) {
  info('here is a use of info make ts happy', a);
  throw `tests are not yet written`;
}
