import rfdc from 'rfdc';
import type * as accounts from '../index.js';
import debug from 'debug';
import type {AccountTx} from '../ledger/types.js';

const deepclone = rfdc({ proto: true });
const info = debug('af/accounts#test/util:info');

export function noteMatches({ note, expect }: { note: any, expect: Record<string,string|number> }): boolean {
  if (typeof note !== 'object') return false;
  for (const [key, val] of Object.entries(expect)) {
    if (note[key] !== val) return false;
  }
  return true; // they are all there.
}

export async function addLineToAccount(
  { partialline, accountname, ledger, lib }: 
  { partialline: object, accountname: string, ledger: accounts.ledger.FinalAccounts, lib: typeof accounts }
) {
  const accts = deepclone(ledger.originals);
  const acct = accts.find(o => o.name === accountname);
  if (!acct) throw `FAIL: did not find ${accountname} in test accounts`;
  const lastline = deepclone(acct.lines.slice(-1)[0]);
  if (!lastline) throw `FAIL: could not grab last line from ${accountname}`;
  acct.lines.push({
    ...lastline,
    ...partialline,
  });
  lib.ledger.recomputeBalances(acct.lines); // fix the balances for the new line
  // recompute everything for new account:
  return await lib.ledger.loadAll({ accts, status: info, startingStep: 'sortAndSeparateTaxMkt' });
}

export async function changeLineInAccount(
  { partialline, accountname, ledger, lib, linematcher }: 
  { 
    partialline: object, 
    accountname: string, 
    ledger: accounts.ledger.FinalAccounts, 
    lib: typeof accounts,
    linematcher: (line: AccountTx) => boolean
  }
) {
  const accts = deepclone(ledger.originals);
  const acct = accts.find(o => o.name === accountname);
  if (!acct) throw `FAIL: did not find ${accountname} in test accounts`;
  const indexToChange = acct.lines.findIndex(linematcher);
  if (indexToChange < 0) throw `FAIL: could not find a line that matched with the linematcher callback`;
  const linetochange = acct.lines[indexToChange]!;
  acct.lines[indexToChange]! = {
    ...linetochange,
    ...partialline,
  };
  lib.ledger.recomputeBalances(acct.lines); // fix the balances for the new line
  // recompute everything for new account:
  return await lib.ledger.loadAll({ accts, status: info, startingStep: 'sortAndSeparateTaxMkt' });
}
