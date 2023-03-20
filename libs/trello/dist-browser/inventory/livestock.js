import { MultiError, LineError, AccountError } from '../err.js';
import { assertPriceWeightPoints } from '../ledger/types.js';
import moment from 'moment';
import { moneyEquals, integerEquals } from '../ledger/util.js';
import debug from 'debug';
import { isSameDay, isSameDayOrBefore } from '../util.js';
const trace = debug('af/accounts#inventory/fifo:trace');
const info = debug('af/accounts#inventory/fifo:info');
//-----------------------------------------------------------------
// DailyGains:
//-----------------------------------------------------------------
export function computeMissingDailyGains({ acct, today }) {
    const missing = [];
    if (acct.lines.length < 1) {
        throw new AccountError({ acct, msg: 'Account is empty, cannot determine start date for daily gains' });
    }
    if (!today)
        today = moment();
    const startDay = acct.lines[0].date;
    for (let date = startDay.clone(); isSameDayOrBefore(date, today); date.add(1, 'day')) {
        if (acct.lines.find(l => isSameDay(l.date, date) && l.category === 'inventory-cattle-dailygain')) {
            continue; // this one is already there
        }
        missing.push(createStarterInventoryTxFromDailyGain({ date }));
    }
    return missing;
}
function createStarterInventoryTxFromDailyGain({ date }) {
    return {
        date: date.clone(),
        description: 'DAILYGAIN',
        category: 'inventory-cattle-dailygain',
        qty: 0,
        taxAmount: 0,
    };
}
//-----------------------------------------------------------------
// Dead:
//-----------------------------------------------------------------
// This only finds any missing dead transactions in the account.  It does not check the records themselves
// for missing entries.  This allows for "correcting" entries in the account.
export function computeMissingDeadTx({ acct, deads }) {
    const missing = [];
    for (const dead of deads) {
        const found = acct.lines.find(l => isSameDay(l.date, dead.date)
            && l.qty === dead.qty);
        if (found)
            continue;
        missing.push(createStarterInventoryTxFromDead({ dead }));
    }
    return missing;
}
function createStarterInventoryTxFromDead({ dead }) {
    // weight should be fixed later when fifo runs to check every line's weight balance
    return {
        date: dead.date,
        description: 'DEAD',
        amount: 0,
        category: 'cattle-dead',
        qty: dead.qty,
    };
}
//----------------------------------------------------------------
// FIFO:
//----------------------------------------------------------------
//-------------------------------------------------------------------------------------------------
// NOTE: do not call any of the rest of these functions if there could be lines missing.  
// !!! THIS CAN ONLY BE CALLED ONCE YOU KNOW
// all the in/out transactions are correct/present AND all dailygain lines AND all dead lines are present.
// This will then compute all the correct values for things and send back to you what needs updating.
//-------------------------------------------------------------------------------------------------
export function computeLivestockFifoChangesNeeded(acct) {
    const expected = computeAmountsTaxAmountsAndWeights(acct);
    if (expected.length !== acct.lines.length) {
        info('FAIL: expected = ', expected);
        throw new MultiError({ msg: `FAIL: computed different number of account lines (${expected.length}) than were present in the account (${acct.lines.length})` });
    }
    const incorrect = [];
    for (const [index, l] of acct.lines.entries()) {
        const exp = expected[index];
        if (!moneyEquals(l.taxAmount, exp.taxAmount)
            || !integerEquals(l.weight, exp.weight)
            || !moneyEquals(l.taxBalance, exp.taxBalance)
            || !integerEquals(l.weightBalance, exp.weightBalance)
            || !moneyEquals(l.amount, exp.amount)
            || !moneyEquals(l.balance, exp.balance)
            || !integerEquals(l.qty, exp.qty)
            || !integerEquals(l.qtyBalance, exp.qtyBalance)) {
            incorrect.push(exp);
        }
    }
    return incorrect;
}
function computeAmountsTaxAmountsAndWeights(acct) {
    const rog = acct.settings.rog;
    let ivty = [];
    const ivtyTaxValue = () => ivty.reduce((sum, group) => group.amount + sum, 0);
    const ivtyHead = () => ivty.reduce((sum, group) => group.qty + sum, 0);
    const ivtyTodayWeight = ({ today }) => ivty.reduce((sum, group) => sum + expectedWeight({ today, rog, group }), 0);
    // This acct does not assert as LivestockInventoryAccount unlesss first line has valid note with aveValuePerWeight
    // Keep a running "current" valuePerWeight formula to be updated from the note at any time and kept
    // until another note changes it
    let aveValuePerWeightFormulaPoints = priceWeightPointsFromLine(acct.lines[0]);
    // mktValue computes using the expected weight
    const ivtyMktValue = ({ today }) => {
        assertPriceWeightPoints(aveValuePerWeightFormulaPoints); // this should always be the case.
        const totalHead = ivtyHead();
        const aveWeight = totalHead ? ivtyTodayWeight({ today }) / totalHead : 0;
        const avePricePerLb = formulaPricePerLb({ formula: aveValuePerWeightFormulaPoints, weight: aveWeight });
        return aveWeight * avePricePerLb * totalHead;
    };
    return acct.lines.map((l, index) => {
        if (index === 0) { // start line
            return {
                index,
                taxAmount: 0,
                weight: 0,
                taxBalance: 0,
                weightBalance: 0,
                amount: 0,
                balance: 0,
                qty: 0,
                qtyBalance: 0,
            };
        }
        const today = l.date;
        // If this line has a new aveValuePerWeight in the note, throw away old one and keep this as the "current"
        if (priceWeightPointsFromLine(l)) {
            aveValuePerWeightFormulaPoints = priceWeightPointsFromLine(l);
        }
        // Track these so it's easy to compute the taxAmount, weight, etc. as just current - previous
        const originalBalance = ivtyMktValue({ today });
        const originalTaxBalance = ivtyTaxValue();
        const originalWeightBalance = ivtyTodayWeight({ today });
        const originalQtyBalance = ivtyHead();
        //-----------------------------------------------
        // Maintain running FIFO Inventory:
        //-----------------------------------------------
        // Cattle purchase: add to inventory
        if (l.qty > 0) {
            ivty.push({
                date: l.date,
                weight: l.weight,
                amount: l.amount,
                incomingAmountPerHead: l.amount / l.qty,
                qty: l.qty,
            });
            // b minus a should keep biggest weights on top (index 0), smallest on bottom
            ivty.sort((a, b) => expectedWeight({ today, rog, group: b }) - expectedWeight({ today, rog, group: a }));
        }
        // Cattle sale or dead: remove from inventory
        if (l.qty < 0) {
            if (originalQtyBalance < l.qty) {
                throw new LineError({ line: l, acct, msg: `Tried to remove ${l.qty} from inventory, but inventory does not have enough qty (${originalQtyBalance}) for that.` });
            }
            let qty = l.qty;
            while (qty > 0) {
                const top = ivty[0];
                if (top.qty > qty) { // this group will handle it, update group:
                    top.qty -= qty;
                    top.amount = top.qty * top.incomingAmountPerHead;
                }
                else { // this group will not handle it, remove it and loop again
                    ivty = ivty.slice(1); // no need to sort, rest are still in proper order
                }
                qty -= top.qty; // still have reference to top as the thing that got taken out of inventory
            }
        }
        //----------------------------------------------
        // Compute parameters/metrics of current inventory:
        //----------------------------------------------
        const balance = ivtyMktValue({ today });
        const taxBalance = ivtyTaxValue();
        const weightBalance = ivtyTodayWeight({ today });
        const qtyBalance = ivtyHead();
        const amount = balance - originalBalance;
        const taxAmount = taxBalance - originalTaxBalance;
        const weight = weightBalance - originalWeightBalance;
        const qty = qtyBalance - originalQtyBalance;
        //-------------------------------------------------------------------------
        // Running inventory has now been updated as if this tx line has happened.
        //-------------------------------------------------------------------------
        // Now decide what this line should say given what we know from the line and the current inventory:
        // DAILYGAIN lines should perfectly match inventory in all respects.  They are the "correcting" lines.
        if (l.category === 'inventory-cattle-dailygain') {
            assertPriceWeightPoints(aveValuePerWeightFormulaPoints); // this should always be the case.
            if (taxBalance !== originalTaxBalance) {
                throw new LineError({ line: l, acct, msg: 'DailyGain line caused a change in taxBalance.  This is not allowed.' });
            }
            return {
                index,
                weight,
                weightBalance,
                taxAmount: 0,
                taxBalance,
                amount,
                balance,
                qty,
                qtyBalance,
            };
        }
        ;
        // DEAD lines perfectly match inventory.
        if (l.category === 'cattle-dead') {
            return {
                index,
                weight,
                weightBalance,
                taxAmount,
                taxBalance,
                amount,
                balance,
                qty,
                qtyBalance
            };
        }
        // The only other kinds of lines are those that must match the bank account (sales and purchases).
        if (l.qty === 0) {
            throw new LineError({ line: l, acct, msg: 'Line has zero quantity change, but it is not an inventory-cattle-dailygain line.  This is not allowed in livestock inventories' });
        }
        // Purchase
        if (l.qty > 0) {
            if (l.weight <= 0) {
                throw new LineError({ line: l, acct, msg: 'Line has positive head but zero or negative weight' });
            }
            // A purchase causes market value to deviate from fifo value.  Taxes keep fifo value, but the amount and weight
            // are whatever the cash account said they were.
            return {
                index,
                amount: l.amount,
                balance: l.balance,
                weight: l.weight,
                weightBalance: l.weightBalance,
                taxAmount,
                taxBalance,
                qty,
                qtyBalance,
            };
        }
        // Sale:
        if (l.weight >= 0) {
            throw new LineError({ line: l, acct, msg: 'Line has negative head but zero or positive weight' });
        }
        return {
            index,
            amount: l.amount,
            balance: l.balance,
            weight: l.weight,
            weightBalance: l.weightBalance,
            taxAmount,
            taxBalance,
            qty,
            qtyBalance,
        };
    });
}
function expectedWeight({ today, rog, group }) {
    const days = moment.duration(today.diff(group.date)).as('days');
    return group.weight + (rog * days * group.qty);
}
function priceWeightPointsFromLine(line) {
    try {
        if (typeof line.note !== 'object')
            throw 'Not an object';
        if (!('aveValuePerWeight' in line.note))
            throw 'Note on line has no aveValuePerWeight';
        if (typeof line.note.aveValuePerWeight !== 'number' && !Array.isArray(line.note.aveValuePerWeight)) {
            throw 'No aveValuePerWeight';
        }
    }
    catch (e) {
        return null;
    }
    // If it's just a number, just need a straight line w/ all the same weights
    if (typeof line.note.aveValuePerWeight === 'number') {
        return [{ weight: 0, price: line.note.aveValuePerWeight }, { weight: 1500, price: line.note.aveValuePerWeight }];
    }
    try {
        assertPriceWeightPoints(line.note.aveValuePerWeight);
    }
    catch (e) {
        return null;
    }
    return line.note.aveValuePerWeight; // otherwise, it's PriceWeightPoint[] already
}
function formulaPricePerLb({ formula, weight }) {
    if (formula.length < 1) {
        throw new MultiError({ msg: 'There are no points in the formula for computing price for a given weight' });
    }
    const first = formula[0];
    if (weight < first.weight)
        return first.price; // flat line before initial weight
    for (const [index, point] of formula.entries()) {
        if (index === 0)
            continue;
        const prev = formula[index - 1];
        if (weight < point.weight) {
            const percentFromPrevWeight = (weight - prev.weight) / (point.weight - prev.weight);
            return prev.price + percentFromPrevWeight * (point.price - prev.price);
        }
    }
    // If we get here, the weight is >= the top weight, so flat line after top weight
    return formula[formula.length - 1].price;
}
//# sourceMappingURL=livestock.js.map