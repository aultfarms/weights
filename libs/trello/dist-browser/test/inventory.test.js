import debug from 'debug';
import rfdc from 'rfdc';
import { noteMatches, addLineToAccount } from './util.js';
const deepclone = rfdc({ proto: true });
const info = debug('af/accounts#test/inventory:info');
export default async function run(lib, ledger) {
    info('testing inventory');
    info('should have no missing lines in test accounts');
    let results = lib.inventory.findMissingTxByInOutCategories(ledger);
    if (results.length > 0) {
        info('FAIL: found some missing lines.  Results = ', results);
        throw `FAIL: results.length is not zero, some lines were found to be missing.`;
    }
    //--------------------------------------------------------
    // Try putting in a line to cash that should be missing:
    info('should show missing lines in inventory if cash line added to bank.rloc for sales-grain-corn');
    let bushels = 1000;
    let newledger = await addLineToAccount({ lib, accountname: 'bank.rloc', ledger, partialline: {
            amount: bushels * 5,
            category: 'sales-grain-corn',
            note: { bushels, note: 'line added by test as present in bank.rloc but missing from inventory' },
        } });
    if (!newledger) {
        throw 'FAIL: could not recompute balances from loadAll for new ledger with new line';
    }
    results = lib.inventory.findMissingTxByInOutCategories(newledger);
    let res = results[0];
    if (!res) {
        info('FAIL: results is', results);
        throw `FAIL: no results returned for missing entries`;
    }
    if (res.acct.name !== 'inventory-grain-corn') {
        info('FAIL: results is', results);
        throw `FAIL: expected inventory-grain-corn to have the only account entry in results, but account [0] had name ${results[0]?.acct.name} instead`;
    }
    if (res.missingInCash.length !== 0) {
        info('FAIL: results is', results);
        throw `FAIL: expected there to be no missing cash transactions, but there are ${results[0].missingInCash.length} instead`;
    }
    if (res.missingInIvty.length !== 1) {
        info('FAIL: results is', results);
        throw `FAIL: expected there to be 1 missing inventory transaction, but there are ${results[0].missingInIvty.length} instead`;
    }
    if (!noteMatches({ note: res.missingInIvty[0].note, expect: { bushels } })) {
        info('FAIL: resutls is', results);
        throw `FAIL: expected bushels to be listed in note for the one Cash transaction that was missing in inventory, but it is not`;
    }
    //--------------------------------------------------------
    // Same thing for putting something in inventory, check that it is missing in cash
    info('should show missing lines in cash if inventory line added to inventory-grain-corn for sales-grain-corn');
    bushels++; // 1001
    newledger = await addLineToAccount({ lib, accountname: 'inventory-grain-corn', ledger, partialline: {
            amount: bushels * 5,
            category: 'sales-grain-corn',
            note: { bushels, note: 'line added by test as present in inventory-grain-corn, but missing from cash' },
        } });
    if (!newledger) {
        throw 'FAIL: could not recompute balances from loadAll for new ledger with new line';
    }
    results = lib.inventory.findMissingTxByInOutCategories(newledger);
    res = results[0];
    if (!res) {
        info('FAIL: results is', results);
        throw `FAIL: no results returned for missing entries`;
    }
    if (res.acct.name !== 'inventory-grain-corn') {
        info('FAIL: results is', results);
        throw `FAIL: expected inventory-grain-corn to have the only account entry in results, but account [0] had name ${res.acct.name} instead`;
    }
    if (res.missingInIvty.length !== 0) {
        info('FAIL: results is', results);
        throw `FAIL: expected there to be no missing inventory transactions, but there are ${res.missingInIvty.length} instead`;
    }
    if (res.missingInCash.length !== 1) {
        info('FAIL: results is', results);
        throw `FAIL: expected there to be 1 missing cash transaction, but there are ${res.missingInCash.length} instead`;
    }
    if (!noteMatches({ note: res.missingInCash[0].note, expect: { bushels } })) {
        info('FAIL: resutls is', results);
        throw `FAIL: expected bushels to be listed in note for the one inventory transaction that was missing in cash, but it is not`;
    }
    info('Done testing inventory');
}
//# sourceMappingURL=inventory.test.js.map