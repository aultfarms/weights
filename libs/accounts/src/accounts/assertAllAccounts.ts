import { MultiError } from './err.js';
import debug from 'debug';
import chalk from 'chalk';

import {
  ValidatedRawSheetAccount,
  Account,
  StatusFunction,
  assertAccount,
} from './types.js';

const info = debug('af/accounts#assertAllAccounts:info');
const { red } = chalk;

export default function(
  { accts, status }
: { accts: ValidatedRawSheetAccount[], status?: StatusFunction }
): Account[] {
  const newaccts: Account[] = [];
  const errors: string[] = [];
  if (!status) status = info;

  for (const acct of accts) {
    if (acct.errors && acct.errors.length > 0) {
      status(red(`Account ${acct.name} had errors`));
      errors.concat(acct.errors);
      continue;
    }

    try { 
      assertAccount(acct);
      newaccts.push(acct);
    } catch(e: any) {
      e = MultiError.wrap(e, `Account failed type validation`);
      errors.concat(e.msgs());
    }
  }
  if (errors.length > 0) {
    throw new MultiError({ msg: errors });
  }
  return newaccts;
}
