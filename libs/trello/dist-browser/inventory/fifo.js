import { MultiError, LineError } from '../err.js';
import moment from 'moment';
import { moneyEquals, integerEquals } from '../ledger/util.js';
import debug from 'debug';
const trace = debug('af/accounts#inventory/fifo:trace');
const info = debug('af/accounts#inventory/fifo:info');
// This only finds any missing dead transactions in the account.  It does not check the records themselves
// for missing entries.  This allows for "correcting" entries in the account.
function computeMissingDeadTx({ acct, dead }) {
    for (const d of dead) {
        const found = acct.lines.find(l => l.date.format('YYYY-MM-DD') === d.date.format('YYYY-MM-DD')
            && l.qty === dead.qty);
        if (found)
            continue;
    }
}
//-------------------------------------------------------------------------------------------------
// NOTE: do not call any of the rest of these functions if there could be lines missing.  
// !!! THIS CAN ONLY BE CALLED ONCE YOU KNOW
// all the in/out transactions are correct AND all dailygain lines are present.
//-------------------------------------------------------------------------------------------------
function computeLivestockFifoChangesNeeded(acct) {
    const expected = computeTaxAmountsAndWeights(acct);
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
            || !integerEquals(l.weightBalance, exp.weightBalance)) {
            incorrect.push(exp);
        }
    }
    return incorrect;
}
function computeTaxAmountsAndWeights(acct) {
    const rog = acct.settings.rog;
    let ivty = [];
    const value = () => ivty.reduce((sum, group) => group.amount + sum, 0);
    const head = () => ivty.reduce((sum, group) => group.qty + sum, 0);
    const todayWeight = ({ today }) => ivty.reduce((sum, group) => sum + expectedWeight({ today, rog, group }), 0);
    return acct.lines.map((l, index) => {
        const ret = {
            index,
            taxAmount: 0,
            weight: 0,
            taxBalance: 0,
            weightBalance: 0, // but I'll feel better if they get checked anyway.
        };
        if (index === 0)
            return ret; // start line
        const today = l.date;
        const originalTaxBalance = value();
        const originalWeightBalance = todayWeight({ today });
        // Cattle purchase: add to inventory
        if (l.qty > 0) {
            ivty.push({
                date: l.date,
                weight: l.weight,
                amount: l.amount,
                incomingAmountPerHead: l.amount / l.qty,
                qty: l.qty,
            });
            ivty.sort(sorter({ today, rog }));
        }
        // Cattle sale or dead: remove from inventory
        if (l.qty < 0) {
            if (head() < l.qty) {
                throw new LineError({ line: l, acct, msg: `Tried to remove ${l.qty} from inventory, but inventory does not have enough qty (${head()}) for that.` });
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
        // Regardless of what kind of line this is, the taxBalance and weightBalance should  match inventory:
        ret.taxBalance = value();
        ret.weightBalance = todayWeight({ today });
        // Inventory has now been updated as if this line has happened.
        if (l.category === 'inventory-dailygain') {
            ret.weight = ret.weightBalance - originalWeightBalance;
            ret.taxAmount = 0; // no tax change allowed on dailygain line
            return ret;
        }
        ;
        // zero-quantity changes that are not dailygain should only affect market values
        if (l.qty === 0) {
            ret.taxAmount = 0; // no quantity change means no expected tax change
            ret.weight = 0; // zero-quantity change should not change weight of herd (don't know which group to apply to)
            return ret;
        }
        // Purchase
        if (l.qty > 0) {
            ret.taxAmount = l.amount; // tax inventory increases by purchase value
            ret.weight = l.weight; // weight is whatever they said it should be
            return ret;
        }
        // Sale/Dead:
        ret.taxAmount = ret.taxBalance - originalTaxBalance; // how much we removed from FIFO for this sale/dead
        ret.weight = l.weight; // for a sale, weight is whatever they say it was, dailygain line will correct to FIFO
        if (l.category === 'cattle-dead') { // dead cattle should adjust weight to match FIFO
            ret.weight = ret.weightBalance - originalWeightBalance;
        }
        return ret;
    });
}
function sorter({ today, rog }) {
    return (a, b) => 
    // b minus a should keep biggest weights on top (index 0), smallest on bottom
    expectedWeight({ today, rog, group: b }) - expectedWeight({ today, rog, group: a });
}
function expectedWeight({ today, rog, group }) {
    const days = moment.duration(today.diff(group.date)).as('days');
    return group.weight + (rog * days * group.qty);
}
//# sourceMappingURL=fifo.js.map