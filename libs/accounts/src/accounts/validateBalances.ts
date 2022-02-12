import { isStart, moneyEquals } from './util.js';
import type { Account } from './types.js';
import { LineError, MultiError } from './err.js';

export default function(
  { accts }
: { accts: Account[] }
): { errors: string[] | null, accts: Account[] } {

  const errs: string[] = [];
  const goodaccts: Account[] = [];
  for (const acct of accts) {
    let balance = 0;

    try {
      for (const [index, line] of acct.lines.entries()) {
        if (isStart(line)) {
          if (index !== 0) {
            throw new LineError({line, msg: 'START line is not first line in acct' });
          }
          balance = line.balance
        } else {
          balance += line.amount ? line.amount : 0;
        }
        if (!moneyEquals(balance, line.balance)) {
          // There is no point continuing on in this account if the balance is ever off,
          // because it will continue to be off for the rest of the transactions.
          throw new LineError({ 
            line, 
            msg: `Balance (${line.balance}) != computed balance from amounts (${balance})`
          });
        }
        goodaccts.push(acct);
      }
    } catch(e: any) {
      e = MultiError.wrap(e, `Account ${acct.name} failed balance validation`);
      errs.concat(e.msgs());
    }
  };
 
  return {
    errors: errs.length > 0 ? errs : null,
    accts: goodaccts
  };
};
