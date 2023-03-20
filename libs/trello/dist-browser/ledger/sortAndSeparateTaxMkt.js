import moment from 'moment';
import { LineError } from '../err.js';
import debug from 'debug';
import rfdc from 'rfdc';
const deepclone = rfdc({ proto: true });
const info = debug('af/accounts#sortAndSeparateTaxMkt:info');
//const trace = debug('af/accounts#sortAndSeparateTaxMkt:trace');
// We have asset/inventory accounts and cash accounts.  
// Let's return (tax, mkt) tx lines (for P&L) and balances (for balance sheets)
function convertStartingBalancesToTxAmounts(lines) {
    lines = deepclone(lines);
    lines = lines.map(l => {
        // asset accounts already have a $0 starting balance w/ net changes in amounts.  
        // "+=" preserves the amounts.  I originally just did amount = balance, and that lost
        // all the asset starting amounts.
        if (l.isStart) {
            l.amount += l.balance;
        }
        return l;
    });
    // Decided to leave all start lines, but turn them into amounts so balance is right.
    // HOWEVER, when computing a P&L, you HAVE to remember to NOT include isStart lines!!
    // Make a new start w/ zero balance 1 day before current oldest:
    const newstart = {
        date: lines[0]?.date.subtract(1, 'day') || moment('1970-01-01', 'YYYY-MM-DD'),
        description: 'Synthetic start for aggregate account',
        amount: 0,
        balance: 0,
        category: 'START',
        isStart: true,
        lineno: -1,
        acct: lines[0].acct,
    };
    // need these for livestock inventory accounts
    if (lines[0] && 'taxAmount' in lines[0])
        newstart.taxAmount = 0;
    if (lines[0] && 'taxBalance' in lines[0])
        newstart.taxBalance = 0;
    lines = [newstart, ...lines];
    return lines;
}
function sortLinesByDate(lines) {
    // Sort by date
    lines.sort((a, b) => {
        if (!a.date || typeof a.date.diff !== 'function') {
            throw new LineError({ line: a, msg: `When sorting lines, line had an empty or invalid date` });
        }
        return a.date.diff(b.date);
    });
    return lines;
}
export function recomputeBalances(lines) {
    for (let i = 0; i < lines.length; i++) {
        let prev = i === 0 ? 0 : lines[i - 1]?.balance || 0;
        if (Math.abs(prev) < 0.01)
            prev = 0;
        if (Math.abs(lines[i].amount) < 0.01)
            lines[i].amount = 0;
        lines[i].balance = prev + lines[i].amount;
        if (lines[i].acct.settings.accounttype === 'inventory') {
            prev = i === 0 ? 0 : lines[i - 1]?.qtyBalance || 0;
            if (Math.abs(prev) < 0.01)
                prev = 0;
            if (Math.abs(lines[i].qty) < 0.01)
                lines[i].qty = 0;
            lines[i].qtyBalance = prev + lines[i].qty;
            if (lines[i].acct.settings.inventorytype === 'livestock') {
                prev = i === 0 ? 0 : lines[i - 1]?.weightBalance || 0;
                if (Math.abs(prev) < 0.01)
                    prev = 0;
                if (Math.abs(lines[i].weight) < 0.01)
                    lines[i].weight = 0;
                lines[i].weightBalance = prev + lines[i].weight;
            }
        }
    }
    ;
    return lines;
}
function combineAndSortLines(accts, status) {
    // Combine lines together:
    let lines = accts.reduce((acc, acct) => ([...acc, ...acct.lines]), []);
    lines = deepclone(lines); // deepclone before we mutate the balances
    lines = sortLinesByDate(lines);
    lines = recomputeBalances(lines);
    return lines;
}
export default function ({ accts, status }) {
    if (!status)
        status = info;
    const originals = accts;
    accts = deepclone(accts); // we will mutate the lines, so clone first
    // First, walk all accounts and get them sorted correctly by date with their balances recomputed accordingly
    status('Sorting all lines by date and recomputing balances accordingly');
    for (const a of accts) {
        a.lines = convertStartingBalancesToTxAmounts(a.lines);
        a.lines = sortLinesByDate(a.lines);
        a.lines = recomputeBalances(a.lines);
    }
    // Now split up tax/mkt into separate sets:
    // All asset type accounts have taxonly or mktonly set on them by the synthetic account creation in assetsToTxAccts.
    // Cash and inventory accounts go in both tax and mkt unless they specify specifically taxonly/mktonly
    let taxaccts = accts.filter(a => a.settings.taxonly ||
        (!a.settings.mktonly &&
            (a.settings.accounttype === 'cash'
                || a.settings.accounttype === 'futures-cash'
                || a.settings.accounttype === 'inventory')));
    const mktaccts = accts.filter(a => a.settings.mktonly ||
        (!a.settings.taxonly &&
            (a.settings.accounttype === 'cash'
                || a.settings.accounttype === 'futures-cash'
                || a.settings.accounttype === 'inventory')));
    // The livestock inventory accounts have taxAmount and taxBalance that need to be 
    // swapped into the amount and balance spots in the tax version of the account.
    taxaccts = taxaccts.map(acct => {
        if (acct.settings.accounttype !== 'inventory')
            return acct;
        if (acct.settings.inventorytype !== 'livestock')
            return acct;
        acct = deepclone(acct); // make a copy so we can mess with the transactions
        for (const tx of acct.lines) {
            tx.mktAmount = tx.amount;
            tx.mktBalance = tx.balance;
            tx.amount = tx.taxAmount;
            tx.balance = tx.taxBalance;
        }
        return acct; // a new clone of the old account
    });
    status('running combineAndSortLines for taxaccts');
    const taxlines = combineAndSortLines(taxaccts, status);
    status('running combineAndSortLines for mktaccts');
    const mktlines = combineAndSortLines(mktaccts, status);
    status('Returning tax and mkt accounts');
    return {
        tax: {
            lines: taxlines,
            accts: taxaccts,
        },
        mkt: {
            lines: mktlines,
            accts: mktaccts,
        },
        originals,
    };
}
//# sourceMappingURL=sortAndSeparateTaxMkt.js.map