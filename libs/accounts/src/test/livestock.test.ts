import type * as accounts from '../index.js';
import debug from 'debug';
import rfdc from 'rfdc';
import moment from 'moment';
import { noteMatches, addLineToAccount } from './util.js';
import type {LivestockInventoryAccount} from '../ledger/types.js';

const deepclone = rfdc({ proto: true });

const info = debug('af/accounts#test/inventory:info');

export default async function run(lib: typeof accounts, ledger: accounts.ledger.FinalAccounts) {

  info('testing livestock inventory');

  info('It should have no missing cash tx lines in livestock inventory');
  const acct = ledger.originals.find(a => a.name === 'inventory-cattle') as LivestockInventoryAccount;
info('livestock acct = ', deepclone(acct));
  const cashaccts = ledger.originals.filter(a => a.settings.accounttype === 'cash');
  const missing1 = lib.inventory.findMissingTxInAccount({ ivtyacct: acct, cashaccts });
  if (missing1.missingInCash.length > 0) {
    info('FAIL: missing = ', missing1);
    throw `FAIL: Livestock inventory account has ${missing1.missingInCash.length} entries that are missing in cash`;
  }
  if (missing1.missingInIvty.length > 0) {
    info('FAIL: missing = ', missing1);
    throw `FAIL: Livestock inventory account has ${missing1.missingInIvty.length} entries that are missing in inventory from cash accounts`;
  }
  
  info('It should have no missing dailygain lines with "today" as date of last line of account');
  const missing2 = lib.inventory.livestock.computeMissingDailyGains({ acct, today: acct.lines[acct.lines.length-1]!.date });
  if (missing2.length !== 0) {
    info('FAIL: missing = ', missing2);
    throw `FAIL: Livestock inventory account has ${missing2.length} dailygain entries`;
  }

  info('It should have no missing dead lines from test Trello board');
  const deads = await lib.inventory.livestock.computeDailyDeadsFromTrello({ acct });
  if (deads.length < 1) throw new Error('Did not find any DailyDead records in Trello');
  const missing3 = lib.inventory.livestock.computeMissingDeadTx({ acct, deads });
  if (missing3.length > 0) {
    info('FAIL: missing = ', missing3);
    throw new Error('Found missing dead transactions that are in Trello but not in account');
  }

  info('It should have no updates to make according to FIFO');
  const updates = lib.inventory.livestock.computeLivestockFifoChangesNeeded(acct);
  if (updates.length > 0) {
    info('FAIL: updates = ', updates);
    throw new Error('Found some updates necessary to make spreadsheet correct.  It should all perfectly match FIFO at this point.');
  }

  info('Done testing inventory');

}


