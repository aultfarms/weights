import { MultiError } from '../err.js';
import moment from 'moment';
import { moneyEquals } from '../ledger/util.js';
import { assertInventoryNote, assertLivestockInventoryNote } from '../ledger/types.js';
import debug from 'debug';
import rfdc from 'rfdc';
export * as livestock from './livestock.js';
const deepclone = rfdc({ proto: true }); // needed for moment
const trace = debug('af/accounts#inventory:trace');
const info = debug('af/accounts#inventory:info');
export function findMissingTxByInOutCategories(accts) {
    if (!accts.originals)
        throw new MultiError({ msg: 'Inventory needs accts.originals, but they are missing' });
    const inventory_accounts = accts.originals.filter(acct => acct.settings.accounttype === 'inventory');
    const cashaccts = accts.originals.filter(acct => acct.settings.accounttype === 'cash');
    const ret = [];
    for (const ivtyacct of inventory_accounts) {
        const results = findMissingTxInAccount({ ivtyacct, cashaccts });
        if (results.missingInIvty.length > 0 || results.missingInCash.length > 0) {
            ret.push({
                ...results,
                acct: ivtyacct,
            });
        }
    }
    return ret;
}
export function findMissingTxInAccount({ ivtyacct, cashaccts }) {
    const settings = ivtyacct.settings;
    const startMoment = moment(`${settings.startYear}-01-01T00:00:00`, 'YYYY-MM-DDTHH:mm:ss');
    const filterToStartYear = (tx) => tx.date.isSameOrAfter(startMoment);
    // Any categories in inventory that are not the "in/out" categories listed in the settings will not have
    // equivalent lines in the cash accounts.  Therefore, filter out all lines outside the date range,
    // and filter out any lines not in the inCategories or outCategories.
    const ivty = ivtyacct.lines // I don't know why I have to cast the lines
        .filter(filterToStartYear)
        .filter(tx => settings.inCategories?.find(c => c === tx.category) || settings.outCategories.find(c => c === tx.category));
    // Find all transactions in any cash accounts with any of those categories
    let cash = [];
    for (const cashacct of cashaccts) {
        const lines = cashacct.lines
            .filter(filterToStartYear)
            .filter(tx => settings.inCategories?.find(c => c === tx.category) || settings.outCategories.find(c => {
            return c === tx.category;
        }));
        cash = [...cash, ...lines];
    }
    // Compare, should be 1-to-1 matching with every line
    return {
        acct: ivtyacct,
        ...compare1To1({ ivty, cash, settings })
    };
}
function compare1To1({ ivty, cash, settings }) {
    // Find any ivty in/out lines not in cash:
    const missingInCash = ivty.filter(ivtytx => !cash.find(cashtx => transactionsAreEquivalent({ ivtytx, cashtx, settings })));
    // Find any cash lines not in ivty:
    const missingInIvty = cash.filter(cashtx => !ivty.find(ivtytx => transactionsAreEquivalent({ ivtytx, cashtx, settings })));
    return { missingInIvty, missingInCash };
}
function createInventoryTxFromCash({ cashtx, settings }) {
    // Is this "out" of inventory (sale) or "in" (purchase)?
    let direction = null;
    if (settings.outCategories.find(oc => oc === cashtx.category)) {
        direction = 'out';
    }
    if (settings.inCategories?.find(oc => oc === cashtx.category)) {
        direction = 'in';
    }
    if (!direction) {
        return null;
    }
    // Grab the quantity from the note:
    let qty = 0;
    let weight = 0;
    try {
        if (settings.inventorytype === 'livestock') {
            assertLivestockInventoryNote(cashtx.note);
            qty = cashtx.note.head;
            weight = cashtx.note.weight;
        }
        else {
            assertInventoryNote(settings.qtyKey, cashtx.note);
            qty = cashtx.note[settings.qtyKey];
        }
    }
    catch (e) {
        return null; // this was not an inventory-related cash transaction
    }
    // make sure "out" is negative quantity
    qty = Math.abs(qty);
    weight = Math.abs(weight);
    if (direction === 'out') {
        qty = -qty;
        weight = -weight;
    }
    const ivtytx = {
        ...deepclone(cashtx),
        amount: -cashtx.amount,
        qty,
        qtyBalance: 0,
        aveValuePerQty: 0,
    };
    if (settings.inventorytype !== 'livestock') {
        return ivtytx;
    }
    const livestockivtytx = {
        ...ivtytx,
        weight,
        weightBalance: 0,
        aveValuePerWeight: 0,
        taxAmount: 0,
        taxBalance: 0,
    };
    return livestockivtytx;
}
function transactionsAreEquivalent({ ivtytx, cashtx, settings }) {
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
        if (expectedIvty.weight !== ivtytx.weight)
            return false;
    }
    // if category, date, amount, qty, and optionally weight all match cash line, then these are the same.
    return true;
}
//# sourceMappingURL=index.js.map