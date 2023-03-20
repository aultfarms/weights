import rfdc from 'rfdc';
import debug from 'debug';
const deepclone = rfdc({ proto: true });
const info = debug('af/accounts#test/util:info');
export function noteMatches({ note, expect }) {
    if (typeof note !== 'object')
        return false;
    for (const [key, val] of Object.entries(expect)) {
        if (note[key] !== val)
            return false;
    }
    return true; // they are all there.
}
export async function addLineToAccount({ partialline, accountname, ledger, lib }) {
    const accts = deepclone(ledger.originals);
    const acct = accts.find(o => o.name === accountname);
    if (!acct)
        throw `FAIL: did not find ${accountname} in test accounts`;
    const lastline = deepclone(acct.lines.slice(-1)[0]);
    if (!lastline)
        throw `FAIL: could not grab last line from ${accountname}`;
    acct.lines.push({
        ...lastline,
        ...partialline,
    });
    lib.ledger.recomputeBalances(acct.lines); // fix the balances for the new line
    // recompute everything for new account:
    return await lib.ledger.loadAll({ accts, status: info, startingStep: 'sortAndSeparateTaxMkt' });
}
//# sourceMappingURL=util.js.map