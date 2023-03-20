//import debug from 'debug';
import { isStart, moneyEquals } from './util.js';
import type { Account } from './types.js';
import { LineError, MultiError } from '../err.js';

//const trace = debug('af/accounts#validateBalances:trace');

export default function(
  { accts }
: { accts: Account[] }
): { errors: string[] | null, accts: Account[] } {

  let errs: string[] = [];
  const goodaccts: Account[] = [];
  for (const acct of accts) {
    const isInventory = acct.settings.accounttype === 'inventory';
    const isLivestock = isInventory && acct.settings.inventorytype === 'livestock';
    let balance = 0;
    let qtyBalance = 0;
    let weightBalance = 0;
    let taxBalance = 0;

    try {
      for (const [index, line] of acct.lines.entries()) {
        if (isStart(line)) {
          if (index !== 0) {
            throw new LineError({line, msg: 'START line is not first line in acct' });
          }
          balance = line.balance
          if (isInventory) qtyBalance = line.qtyBalance;
          if (isLivestock) {
            weightBalance = line.weightBalance;
            taxBalance = line.taxBalance;
          }
        } else {
          balance += line.amount || 0;
          if (isInventory) qtyBalance += line.qty || 0;
          if (isLivestock) {
            weightBalance += line.weight || 0;
            taxBalance += line.taxAmount || 0;
          }
        }
        // There is no point continuing on in this account if the balance is ever off,
        // because it will continue to be off for the rest of the transactions.
        if (!moneyEquals(balance, line.balance)) throw new LineError({ line, msg: `Balance (${line.balance}) != computed balance from amounts (${balance})` });
        if (isInventory) {
          if (!moneyEquals(qtyBalance, line.qtyBalance)) throw new LineError({ line, msg: `qtyBalance (${line.qtyBalance}) != computed balance from qty's (${qtyBalance})` });
        }
        if (isLivestock) {
          if (!moneyEquals(weightBalance, line.weightBalance)) throw new LineError({ line, msg: `weightBalance (${line.weightBalance}) != computed balance from weight's (${weightBalance})` });
          if (!moneyEquals(taxBalance, line.taxBalance)) throw new LineError({ line, msg: `taxBalance (${line.taxBalance}) != computed balance from taxAmount's (${taxBalance})` });
        }
      }
      goodaccts.push(acct);
    } catch(e: any) {
      e = MultiError.wrap(e, `Account ${acct.name} failed balance validation `);
      errs = [ ...errs, ...e.msgs()];
    }
  };
 
  return {
    errors: errs.length > 0 ? errs : null,
    accts: goodaccts
  };
};
