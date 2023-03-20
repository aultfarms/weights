import { LineError, MultiError, AccountError } from '../err.js';
import type { Moment } from 'moment';
import debug from 'debug';
import chalk from 'chalk';

import {
  ValidatedRawSheetAccount,
  Account,
  StatusFunction,
  assertAccount,
  assertInventoryAccount,
  assertLivestockInventoryAccount,
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
      errors.push(...acct.errors);
      continue;
    }

    try { 
      assertAccount(acct);
      if (acct.settings.accounttype === 'inventory') {
        if (acct.settings.inventorytype === 'livestock') {
          assertLivestockInventoryAccount(acct);
        } else {
          assertInventoryAccount(acct)
        }
      }
      newaccts.push(acct);

      // Check that all the dates on all the transactions seem reasonable (i.e. not too far away from each other)
      // I moved this here instead of in standardize because standardize runs before splits, so split lines
      // with mistyped dates were not throwing errors.
      let latestReasonableDate: Moment | null = null;
      let latestReasonableDateLineno: number | null = null;
      for (const l of acct.lines) {
        if (!latestReasonableDate) {
          latestReasonableDate = l.date;
          latestReasonableDateLineno = l.lineno;
        }
        if (!l.date) throw new LineError({ line: l, msg: `Line has no date` });
        const diff = Math.abs(l.date.diff(latestReasonableDate,'days'));
        const type = acct.settings.taxonly ? 'tax' : 'mkt';
        try {
          if (l.acct.settings.accounttype.match(/cash/) && diff > 300) {

            if (l.note && typeof l.note === 'object' && 'latecash' in l.note) {
              info(`Line ${l.lineno} of ${l.acct?.name} is more than 300 days (${diff} days) away from the previous valid date.  However, line.note has latecash key so we are ignoring it.`);
            } else {
              errors.push(...(new LineError({ 
                line: l, 
                msg: `${type} (${l.date.format('YYYY-MM-DD')}) is more than 300 days (${diff} days) away from the previous valid date `+
                     `(${latestReasonableDate.format('YYYY-MM-DD')}) from line `+
                     `${latestReasonableDateLineno}.  This is an error since it is a cash account.  `+
                     `Did you put the wrong year on this line?  If it is correct, insert a $0 transaction with a closer date.  If you are absolutely `+
                     `sure that this is correct, you can also add latecash: true to the note.`
              })).msgs());
            }

          } else if (l.date.isBefore(latestReasonableDate) && diff > 90) {
            if (l.note && typeof l.note === 'object' && 'latecash' in l.note) {
              info(`Line ${l.lineno} of ${l.acct?.name} has date more than 90 days before previous line, but line.note has latecash key so we are ignoring it.`);
            } else {
              errors.push(...(new LineError({ 
                line: l, 
                msg: `${type} (${l.date.format('YYYY-MM-DD')}) is before the previous valid date `+
                     `(${latestReasonableDate.format('YYYY-MM-DD')}) from line `+
                     `${latestReasonableDateLineno} by more than 60 days (${diff} days).  `+
                     `Did you put the wrong year on this line?  If it is correct, add latecash: true to the note.` 
              })).msgs());
            }
          }
        } finally {
          latestReasonableDate = l.date;
          latestReasonableDateLineno = l.lineno;
        }
      }
    } catch(e: any) {
      e = AccountError.wrap(e, acct, `Account ${acct.name} failed type validation`);
      errors.push(...e.msgs());
    }


  }
  if (errors.length > 0) {
    throw new MultiError({ msg: errors });
  }
  return newaccts;
}
