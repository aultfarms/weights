import type * as accounts from '../index.js';
import debug from 'debug';
import rfdc from 'rfdc';
import { noteMatches, addLineToAccount, changeLineInAccount } from './util.js';
import type { InventoryAccountTx } from '../ledger/types.js';


//--------------------------------------------------------------------
// The actual test that tries adding lines to the inventory accounts
// in the google sheets and fixing them are located in
// browser/inventory.test.ts.  These just add things in-memory and test.
//--------------------------------------------------------------------

const deepclone = rfdc({ proto: true });

const info = debug('af/accounts#test/inventory:info');

export default async function run(lib: typeof accounts, ledger: accounts.ledger.FinalAccounts) {

  info('testing inventory');

  // In order to compute livestock missing dailygain lines properly, have to know the date
  // on the last line of the test account and assume that is today:
  const livestock = ledger.originals.find(acct => acct.name === 'inventory-cattle');
  if (!livestock) throw `Could not find inventory-cattle account`;
  const lastline = livestock.lines[livestock.lines.length-1]!;
  const today = lastline.date;

  info('should have no missing lines in test accounts');
  let results = await lib.inventory.findMissingTx({ finalaccts: ledger, today });
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
  }});

  if (!newledger) {
    throw 'FAIL: could not recompute balances from loadAll for new ledger with new line'
  }
  results = await lib.inventory.findMissingTx({ finalaccts: newledger, today });
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
    throw `FAIL: expected there to be no missing cash transactions, but there are ${results[0]!.missingInCash.length} instead`;
  }
  if (res.missingInIvty.length !== 1) {
    info('FAIL: results is', results);
    throw `FAIL: expected there to be 1 missing inventory transaction, but there are ${results[0]!.missingInIvty.length} instead`;
  }
  if (!noteMatches({ note: res.missingInIvty[0]!.note, expect: { bushels } })) {
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
  }});

  if (!newledger) {
    throw 'FAIL: could not recompute balances from loadAll for new ledger with new line'
  }
  results = await lib.inventory.findMissingTx({ finalaccts: newledger, today });
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
  if (!noteMatches({ note: res.missingInCash[0]!.note, expect: { bushels } })) {
    info('FAIL: results is', results);
    throw `FAIL: expected bushels to be listed in note for the one inventory transaction that was missing in cash, but it is not`;
  }

  //---------------------------------------------------------------------------------------
  // Now if I change one of the entries from the original account where everything matched,
  // it should show that the two lines are present in both but one is wrong
  info('should show presentInBothButOneIsWrong if a cash line qty is changed');
  bushels++;
  newledger = await changeLineInAccount({ lib, ledger,
    accountname: 'bank.rloc', 
    partialline: {
      note: { bushels },
    },
    linematcher: (l) => l.date.year() >= 2022 && l.category === 'sales-grain-corn',
  });
  if (!newledger) throw new Error('FAIL: unable to change line in account: returned falsey');
  results = await lib.inventory.findMissingTx({ finalaccts: newledger, today });
  res = results[0];
  if (!res) {
    info('FAIL: results is', results);
    throw `FAIL: no results returned for wrong entries`;
  }
  if (res.acct.name !== 'inventory-grain-corn') {
    info('FAIL: results is', results);
    throw `FAIL: expected inventory-grain-corn to have the only account entry in results, but account [0] had name ${res.acct.name} instead`;
  }
  if (res.missingInIvty.length !== 0) {
    info('FAIL: results is', results);
    throw `FAIL: expected there to be no missing inventory transactions, but there are ${res.missingInIvty.length} instead`;
  }
  if (res.missingInCash.length !== 0) {
    info('FAIL: results is', results);
    throw `FAIL: expected there to be no missing cash transactions, but there are ${res.missingInCash.length} instead`;
  }
  if(res.presentInBothButOneIsWrong.length !== 1) {
    info('FAIL: results is', results);
    throw `FAIL: expected there to be one presentInBothButOneIsWrong transactions, but there are ${res.presentInBothButOneIsWrong.length} instead`;
  }
  if (!noteMatches({ note: res.presentInBothButOneIsWrong[0]!.cashtx.note, expect: { bushels } })) {
    info('FAIL: results is', results);
    throw `FAIL: expected bushels to be listed in note for the cash tx of presentInBothButOneIsWrong, but it was not valid`;
  }


  //---------------------------------------------------------------------------------------
  // Same thing for inventory line
  info('should show presentInBothButOneIsWrong if a ivty line qty is changed (as opposed to a cash line changed in the last test)');
  bushels++;
  newledger = await changeLineInAccount({ lib, ledger, 
    accountname: 'inventory-grain-corn', 
    partialline: {
      qty: -1 * bushels, // bushels are negative in ivty
    },
    linematcher: (l) => l.date.year() >= 2022 && l.category === 'sales-grain-corn',
  });
  if (!newledger) throw new Error('FAIL: unable to change line in account: returned falsey');
  results = await lib.inventory.findMissingTx({ finalaccts: newledger, today });
  res = results[0];
  if (!res) {
    info('FAIL: results is', results);
    throw `FAIL: no results returned for wrong entries`;
  }
  if (res.acct.name !== 'inventory-grain-corn') {
    info('FAIL: results is', results);
    throw `FAIL: expected inventory-grain-corn to have the only account entry in results, but account [0] had name ${res.acct.name} instead`;
  }
  if (res.missingInIvty.length !== 0) {
    info('FAIL: results is', results);
    throw `FAIL: expected there to be no missing inventory transactions, but there are ${res.missingInIvty.length} instead`;
  }
  if (res.missingInCash.length !== 0) {
    info('FAIL: results is', results);
    throw `FAIL: expected there to be no missing cash transactions, but there are ${res.missingInCash.length} instead`;
  }
  if(res.presentInBothButOneIsWrong.length !== 1) {
    info('FAIL: results is', results);
    throw `FAIL: expected there to be one presentInBothButOneIsWrong transactions, but there are ${res.presentInBothButOneIsWrong.length} instead`;
  }
  if (res.presentInBothButOneIsWrong[0]!.ivtytx.qty !== -1*bushels) {
    info('FAIL: results is', results);
    throw `FAIL: expected bushels in ivtytx of presentInBothButOneIsWrong to equal the negative of the changed bushels ${-1*bushels}, but it is ${res.presentInBothButOneIsWrong[0]!.ivtytx.qty} instead`;
  }




  info('Done testing inventory');

}


