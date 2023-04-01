import { MultiError } from '../err.js';
import moment, { Moment } from 'moment';
import { moneyEquals } from '../ledger/util.js';
import type { FinalAccounts, Account, InventoryAccount, InventoryAccountSettings, InventoryAccountTx, LivestockInventoryAccountTx, AccountTx, LivestockInventoryAccount } from '../ledger/types.js';
import { assertInventoryNote, assertLivestockInventoryNote } from '../ledger/types.js';
import debug from 'debug';
import rfdc from 'rfdc';
import {isBeforeDay, isSameDay, isSameDayOrAfter} from '../util.js';
import type {RowObject} from '@aultfarms/google/dist/sheets';
import {computeMissingLivestockTx} from './livestock.js';
import { stringify } from '../ledger/settings-parser.js';

export * as livestock from './livestock.js';

const deepclone = rfdc({ proto: true }); // needed for moment
//const trace = debug('af/accounts#inventory:trace');
const info = debug('af/accounts#inventory:info');


export type PresentInBothResult = {
  ivtytx: InventoryAccountTx,
  cashtx: AccountTx,
};
export type MissingTxResult = {
  acct: InventoryAccount,
  missingInIvty: AccountTx[],
  missingInCash: InventoryAccountTx[],
  presentInBothButOneIsWrong: PresentInBothResult[],
  // For livestock accounts only:
  missingLivestock?: LivestockInventoryAccountTx[],
}
export type LivestockMissingTxResult = MissingTxResult & {
  acct: LivestockInventoryAccount,
  missingDead: LivestockInventoryAccountTx[],
  missingDailyGain: LivestockInventoryAccountTx[],
  fifoChangesNeeded: LivestockInventoryAccountTx[],
}

export type AccountFix = {
  filename: string,
  name: string, // name of account and also the sheet name
  rows: RowObject[],
};
  

export async function findMissingTx({ finalaccts, today}: { finalaccts: FinalAccounts, today?: Moment } ) {
  if (!finalaccts.originals) throw new MultiError({ msg: 'Inventory needs accts.originals, but they are missing' });
  const inventory_accounts: InventoryAccount[] = (finalaccts.originals.filter(acct => acct.settings.accounttype === 'inventory') as InventoryAccount[]);
  const cashaccts = finalaccts.originals.filter(acct => acct.settings.accounttype === 'cash');

  const ret: MissingTxResult[] = [];
  for (const ivtyacct of inventory_accounts) {
    const results = await findMissingTxInAccount({ ivtyacct, cashaccts, today });
    if (results.missingInIvty.length > 0 || results.missingInCash.length > 0 || results.presentInBothButOneIsWrong.length > 0) {
      info('findMissingTx: Found missing tx on ivtyacct', ivtyacct.name, ':',results);
      ret.push({
        ...results,
        acct: ivtyacct,
      });
    }
  }
  return ret;
}

// This is async b/c we have to wait on Trello for dead records
export async function findMissingTxInAccount({ ivtyacct, cashaccts, today }: { ivtyacct: InventoryAccount, cashaccts: Account[], today?: Moment }): Promise<MissingTxResult> {
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
  const { missingInIvty, missingInCash, presentInBothButOneIsWrong } =  compare1To1({ ivty, cash, settings })

  // For missingInCash, we can't suggest any lineno's b/c we don't really know
  // what cash account it should go into.

  // Figure up lineno's for any missing inventory lines:
  for (const m of missingInIvty) {
    // Always put at the end of existing lines, which means find the first tx with 
    // a date that that is beyond the date on the missing tx, and it goes on the line
    // where that future tx currently lives (it's lineno).
    const acctline = ivtyacct.lines.find(l => isSameDayOrAfter(l.date, m.date));
    let lineno = acctline?.lineno;
    if (typeof lineno !== 'number') { // put on the end
      lineno = ivtyacct.lines[ivtyacct.lines.length - 1]!.lineno + 1;
    }
    m.lineno = lineno;
  }


  // Add in any missing dead or dailygain lines if livestock account. 
  if (ivtyacct.settings.inventorytype === 'livestock') {
    const missingLivestock = await computeMissingLivestockTx({ acct: (ivtyacct as LivestockInventoryAccount), today });
    if (missingLivestock.length > 0) {
      // Merge these into the main list, always putting livestock transactions after
      // any other missing transactions (sales/purchases).  Livestock transactions
      // already have lineno's on them.  Therefore, find first entry with a lineno
      // greater than the one on the livestock entry, and put livestock entry there.
      for (const ml of missingLivestock) {
        let index = missingInIvty.findIndex(l => l.lineno > ml.lineno);
        if (index < 0) { // put on the end
          index = missingInIvty.length;
        }
        missingInIvty.splice(index, 0, ml);
      }
    }
  }

  // Now sort all the lines to be in the proper order.  First sort is by lineno, then date, then dailygain line is last for date
  missingInIvty.sort((a,b) => {
    if (a.lineno !== b.lineno) return a.lineno - b.lineno;
    if (!isSameDay(a.date,b.date)) return a.date.unix() - b.date.unix();
    if (a.category === 'inventory-cattle-dailygain' && b.category !== 'inventory-cattle-dailygain') return 1; // "a" should go after "b", so positive number
    if (b.category === 'inventory-cattle-dailygain'&& a.category !== 'inventory-cattle-dailygain') return -1; // "b" should go after "a", so negative number
    // Otherwise, order is arbitrary, so just consider the lines equal
    return 0;
  });


  return {
    acct: ivtyacct,
    missingInCash,
    missingInIvty,
    presentInBothButOneIsWrong,
  };

}

function compare1To1({ ivty, cash, settings }: { ivty: InventoryAccountTx[], cash: AccountTx[], settings: InventoryAccountSettings }) {
  // Find any ivty in/out lines not in cash:
  let missingInCash: InventoryAccountTx[] = [];
  for (const ivtytx of ivty) {
    const match = cash.find(cashtx => transactionsAreEquivalent({
      ivtytx, 
      expected: createInventoryTxFromCash({ cashtx, settings }),
      settings,
    }));
    if (!match) missingInCash.push(ivtytx)
  }
  let missingInIvty: InventoryAccountTx[] = [];
  for (const cashtx of cash) {
    const expected = createInventoryTxFromCash({ cashtx, settings });
    const match = ivty.find(ivtytx => transactionsAreEquivalent({
      ivtytx,
      expected,
      settings,
    }));
    if (!match && expected) missingInIvty.push(expected);
  }

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
  // Note the "_" on the front of _val tells TS this is intended to be ignored
  missingInIvty = missingInIvty.filter((_val, index) => txIndexesToRemoveFromMissingInIvty.findIndex(i => i === index) < 0);

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
    assertInventoryNote(settings.qtyKey, cashtx.note);
    qty = cashtx.note[settings.qtyKey]!;
    if (settings.inventorytype === 'livestock') {
      assertLivestockInventoryNote(cashtx.note);
      if (!settings.qtyKey) qty = cashtx.note.head; // in case they forgot the qtyKey on livestock acct
      weight = cashtx.note.weight;
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
    qty,
    qtyBalance: 0, // these would have to be filled in later
    aveValuePerQty: 0,
  };
  if (settings.inventorytype !== 'livestock') {
    return ivtytx;
  }
  // Fixup the note to remove cash-ey things:
  if (ivtytx.note && typeof ivtytx.note === 'object') {
    ivtytx.note = deepclone(ivtytx.note);
    if ('qty' in ivtytx.note) delete ivtytx.note.qty;
    if ('bushels' in ivtytx.note) delete ivtytx.note.bushels;
    if ('head' in ivtytx.note) delete ivtytx.note.head;
    if ('weight' in ivtytx.note) delete ivtytx.note.weight;
    if ('loads' in ivtytx.note) delete ivtytx.note.loads;
    if ('latecash' in ivtytx.note) delete ivtytx.note.latecash;
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

function transactionsAreEquivalent({ ivtytx, expected, settings }: { ivtytx: InventoryAccountTx, expected: InventoryAccountTx | null, settings: InventoryAccountSettings }) {
  if (!expected) {
    return false; // cash tx didn't have the stuff in the note for inventory
  }
  if (ivtytx.category !== expected.category) {
    return false;
  }
  if (ivtytx.date.format('YYYY-MM-DD') !== expected.date.format('YYYY-MM-DD')) {
    return false;
  }
  if (!moneyEquals(ivtytx.amount, expected.amount)) {
    return false;
  }
  if (expected.qty !== ivtytx.qty) {
    return false;
  }
  if (settings.inventorytype === 'livestock') {
    if (expected.weight !== ivtytx.weight) return false;
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
