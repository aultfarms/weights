import { MultiError } from '../err.js';
import moment, { Moment } from 'moment';
import { moneyEquals } from '../ledger/util.js';
import type { FinalAccounts, Account, InventoryAccount, InventoryAccountSettings, InventoryAccountTx, LivestockInventoryAccountTx, AccountTx } from '../ledger/types.js';
import { assertInventoryNote, assertLivestockInventoryNote } from '../ledger/types.js';
import debug from 'debug';
import rfdc from 'rfdc';
import {isSameDay} from '../util.js';

export * as livestock from './livestock.js';

const deepclone = rfdc({ proto: true }); // needed for moment
const trace = debug('af/accounts#inventory:trace');
const info = debug('af/accounts#inventory:info');


//--------------------------------------------------------------------------
// DO NOT IGNORE THIS OVERALL PLAN:
// 1. Do all TX's for categories exist where they should?  If not, ask user to add them (button).
//   --> need to make sure a missing line that has the same type on the same day but a wrong amount is not reported as two
//       missing lines, but rather as a single "wrong" line that should be fixed.  Can just let them fix it manually for now
//       since this shouldn't really happen that much unless somebody changed a number somewhere.
// 2. Do all dead TX's exist for livestock?  If not, ask user to add them (button).
// 3. Do all dailygain TX's exist for livestock?  If not, ask user to add them (button).
//
// !!! All expected lines must exist before user can proceed !!!
// 4. Show incorrect taxAmounts, ask user to fix (button).
// 5. Show incorrect weights, ask user to fix (button). (dead, dailygain => weightBalance match FIFO)
//
//
// FINAL VALIDATION (no more changes should be needed):
// 4. All lines: taxBalance should match FIFO
// 5: All lines (dead especially): weightBalance should match FIFO expectedWeight
// 5: DailGain line: should have 0 for qty
// 7: DailyGain line: ave. $/lb must match settings



export type PresentInBothResult = {
  ivtytx: InventoryAccountTx,
  cashtx: AccountTx,
};
export type MissingTxResult = {
  acct: InventoryAccount,
  missingInIvty: AccountTx[],
  missingInCash: InventoryAccountTx[],
  presentInBothButOneIsWrong: PresentInBothResult[],
}

export function findMissingTxByInOutCategories(accts: FinalAccounts) {
  if (!accts.originals) throw new MultiError({ msg: 'Inventory needs accts.originals, but they are missing' });
  const inventory_accounts: InventoryAccount[] = (accts.originals.filter(acct => acct.settings.accounttype === 'inventory') as InventoryAccount[]);
  const cashaccts = accts.originals.filter(acct => acct.settings.accounttype === 'cash');

  const ret: MissingTxResult[] = [];
  for (const ivtyacct of inventory_accounts) {
    const results = findMissingTxInAccount({ ivtyacct, cashaccts });
    if (results.missingInIvty.length > 0 || results.missingInCash.length > 0 || results.presentInBothButOneIsWrong.length > 0) {
      ret.push({
        ...results,
        acct: ivtyacct,
      });
    }
  }
  return ret;
}

export function findMissingTxInAccount({ ivtyacct, cashaccts }: { ivtyacct: InventoryAccount, cashaccts: Account[] }): MissingTxResult {
  const settings = ivtyacct.settings;
  const startMoment = moment(`${settings.startYear}-01-01T00:00:00`, 'YYYY-MM-DDTHH:mm:ss');
  const filterToStartYear = (tx: AccountTx) => tx.date.isSameOrAfter(startMoment);

  // Any categories in inventory that are not the "in/out" categories listed in the settings will not have
  // equivalent lines in the cash accounts.  Therefore, filter out all lines outside the date range,
  // and filter out any lines not in the inCategories or outCategories.
  const ivty: InventoryAccountTx[] = (ivtyacct.lines as InventoryAccountTx[]) // I don't know why I have to cast the lines
    .filter(filterToStartYear)
    .filter(tx => settings.inCategories?.find(c => c === tx.category) || settings.outCategories.find(c => c === tx.category));

  // Find all transactions in any cash accounts with any of those categories
  let cash: AccountTx[] = [];
  for (const cashacct of cashaccts) {
    const lines = cashacct.lines
      .filter(filterToStartYear)
      .filter(tx => settings.inCategories?.find(c => c === tx.category) || settings.outCategories.find(c => {
        return c === tx.category;
      }));
    cash = [ ...cash, ...lines ];
  }

  // Compare, should be 1-to-1 matching with every line
  return {
    acct: ivtyacct,
    ...compare1To1({ ivty, cash, settings })
  };
}

function compare1To1({ ivty, cash, settings }: { ivty: InventoryAccountTx[], cash: AccountTx[], settings: InventoryAccountSettings }) {
  // Find any ivty in/out lines not in cash:
  const missingInCash = ivty.filter(ivtytx => !cash.find(cashtx => transactionsAreEquivalent({ ivtytx, cashtx, settings })));
  // Find any cash lines not in ivty:
  let missingInIvty = cash.filter(cashtx => !ivty.find(ivtytx => transactionsAreEquivalent({ ivtytx, cashtx, settings })));
  // Now find any that are the same category and day, but a wrong amount.
  let presentInBothButOneIsWrong: PresentInBothResult[] = [];
  const txIndexesToRemoveFromMissingInIvty: number[] = [];
  // this is a little confusing: a "missingInCash" item is actually FROM the ivty account, so it's an InventoryAccountTx, and vice-versa
  for (const [cashtxIndex, cashtx] of missingInIvty.entries()) {
    const ivtytxIndex = missingInCash.findIndex(ivtytx => transactionsSameDateAndCategory({ ivtytx, cashtx, settings }));
    const ivtytx = missingInCash[ivtytxIndex];
    if (ivtytx) {
      presentInBothButOneIsWrong.push({ ivtytx, cashtx });
      // Remove the cashtx index now so we don't match on it again later
      missingInCash.splice(ivtytxIndex, 1); // delete 1 thing at index (in-place)
      // Remove the cashtx indexes later since we're looping over that array
      txIndexesToRemoveFromMissingInIvty.push(cashtxIndex);
    }
  }
  // Now just remove all the ivtytx transactions as needed
  // You can't just use !"find" below b/c it returns the value, and the value is 0 if index 0 is to be removed
  missingInIvty = missingInIvty.filter((val, index) => txIndexesToRemoveFromMissingInIvty.findIndex(i => i === index) < 0);

  return { missingInIvty, missingInCash, presentInBothButOneIsWrong };
}

function createInventoryTxFromCash({ cashtx, settings } : { cashtx: AccountTx, settings: InventoryAccountSettings }): InventoryAccountTx | null {
  // Is this "out" of inventory (sale) or "in" (purchase)?
  let direction: 'in' | 'out' | null = null;
  if (settings.outCategories.find(oc => oc === cashtx.category)) {
    direction = 'out'
  }
  if (settings.inCategories?.find(oc => oc === cashtx.category)) {
    direction = 'in'
  }
  if (!direction) {
    return null;
  }

  // Grab the quantity from the note:
  let qty: number = 0;
  let weight: number = 0;
  try {
    if (settings.inventorytype === 'livestock') {
      assertLivestockInventoryNote(cashtx.note);
      qty = cashtx.note.head;
      weight = cashtx.note.weight;
    } else {
      assertInventoryNote(settings.qtyKey, cashtx.note);
      qty = cashtx.note[settings.qtyKey]!;
    }
  } catch(e: any) {
    return null; // this was not an inventory-related cash transaction
  }

  // make sure "out" is negative quantity
  qty = Math.abs(qty); 
  weight = Math.abs(weight);
  if (direction === 'out') {
    qty = -qty;
    weight = -weight;
  }

  const ivtytx: InventoryAccountTx = {
    ...deepclone(cashtx),
    amount: -cashtx.amount, // amount on inventory always offsets amount from cash TX regardless of direction
    qty, // if this is 
    qtyBalance: 0, // these would have to be filled in later
    aveValuePerQty: 0,
  };
  if (settings.inventorytype !== 'livestock') {
    return ivtytx;
  }
  const livestockivtytx: LivestockInventoryAccountTx = {
    ...ivtytx,
    weight,
    weightBalance: 0,
    aveValuePerWeight: 0,
    aveWeightPerQty: 0,
    taxAmount: 0, // FIFO has to fill this in later
    taxBalance: 0,
  }
  return livestockivtytx;
}

function transactionsAreEquivalent({ ivtytx, cashtx, settings }: { ivtytx: InventoryAccountTx, cashtx: AccountTx, settings: InventoryAccountSettings }) {
  const expectedIvty = createInventoryTxFromCash({ cashtx, settings });
  if (!expectedIvty) {
    return false; // cash tx didn't have the stuff in the note for inventory
  }
  if (ivtytx.category !== expectedIvty.category) {
    return false;
  }
  if (ivtytx.date.format('YYYY-MM-DD') !== expectedIvty.date.format('YYYY-MM-DD')) {
    return false;
  }
  if (!moneyEquals(ivtytx.amount, expectedIvty.amount)) {
    return false;
  }
  if (expectedIvty.qty !== ivtytx.qty) {
    return false;
  }
  if (settings.inventorytype === 'livestock') {
    if (expectedIvty.weight !== ivtytx.weight) return false;
  }
  // if category, date, amount, qty, and optionally weight all match cash line, then these are the same.
  return true;
}

function transactionsSameDateAndCategory({ ivtytx, cashtx, settings }: { ivtytx: InventoryAccountTx, cashtx: AccountTx, settings: InventoryAccountSettings }) {
  const expectedIvty = createInventoryTxFromCash({ cashtx, settings });
  if (!expectedIvty) return false;
  if (!isSameDay(expectedIvty.date, ivtytx.date)) return false;
  if (expectedIvty.category !== ivtytx.category) return false;
  return true;
}
