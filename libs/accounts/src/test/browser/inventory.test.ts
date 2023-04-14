import type * as accountsLib from '../../browser/index.js';
import { drive } from '@aultfarms/google';
import { getClient as getTrelloClient } from '@aultfarms/trello';
import debug from 'debug';
import {type Account, type AccountTx, assertLivestockInventoryAccount} from '../../ledger/types.js';
import moment, {type Moment} from 'moment';

const info = debug('af/accounts#test/browser/inventory:info');

export default async function run(accounts: typeof accountsLib, pathroot: string, sourceAccountsDir: string) {
  info('browser-specific inventory tests (copy and change actual sheets)');

  // This test turns out to be pretty complicated.  Steps:
  // ---- Setup
  // 1: Copy existing accounts to a new folder so we can mess with them.
  // 2: Load those accounts, check they are valid.
  // ---- Add new lines
  // 3: Put the new corn/cattle lines in cash accounts.
  // 4: Put test dead card into Trello
  // 5: Reload accounts
  // 6: Run inventory, verify that we have missing things now.
  // 7: Apply fixes.
  // 8: Reload accounts
  // 9: Verify that we have no missing things now.
  // ---- Update lines
  // 10: Compute FIFO changes needed, Verify that we have some
  // 11: Apply FIFO changes needed
  // 12: Reload accounts
  // 13: Verify no missing tx 
  // 14: Verify no FIFO changes needed


  // Copy all the test accounts to a new folder:
  const destpath = `${pathroot}/MUTATABLE-ACCOUNTS`;
  info('It should be able to copy all the test accounts to a temp folder at',destpath);
  const destInfo = await drive.ensurePath({ path: destpath });
  if (!destInfo) throw `Could not ensurePath for destpath ${destpath}`;
  const destinationFolderid = destInfo.id;
  const sourceInfo = await drive.idFromPath({ path: sourceAccountsDir });
  if (!sourceInfo) throw `Could not find info on source path ${sourceAccountsDir}`;
  const sourceFolderid = sourceInfo.id;
  await drive.copyAllFilesFromFolderToExistingFolder({ sourceFolderid, destinationFolderid });

  info('It should be able to read all those test accounts');
  const rawaccts = await accounts.google.readAccountsFromGoogle({
    status: info,
    accountsdir: destpath,
  });
  const ledger = await accounts.ledger.loadAll({ rawaccts, status: info });
  if (!ledger) throw `Could not loadAll from the copied test accounts`;


  info('The test should be able to cleanup any lingering test dead cards');
  let livestock = ledger.originals.find(a => a.name === 'inventory-cattle');
  if (!livestock) throw `ERROR: could not find inventory-cattle account`;
  await deleteTestDeadCardFromTrelloIfExists({ acct: livestock });


  info('The test accounts that were read should have no missing lines before we mess with them');
  let today = livestock.lines[livestock.lines.length-1]!.date;
  let missing = await accounts.inventory.findMissingTx({ finalaccts: ledger, today });
  if (missing.length > 0) {
    info('ERROR: missing =', missing);
    throw `ERROR: Expected to have no missing transsactions in test accounts`;
  }

  info('Adding a corn sale, a cattle sale, and a cattle purchase to cash accounts, and a dead cow to Trello');
  // bank.rloc
  const bankrloc = ledger.originals.find(a => a.name === 'bank.rloc');
  if (!bankrloc) throw `Could not find bank.rloc account`;
  const bankchecking = ledger.originals.find(a => a.name === 'bank.checking');
  if (!bankchecking) throw `Could not find bank.checking account`;
  let date = moment('2022-02-01', 'YYYY-MM-DD');
  const cornSaleTx: AccountTx = {
    acct: bankrloc,
    lineno: bankrloc.lines[bankrloc.lines.length-1]!.lineno + 1,
    date: date.clone(),
    postDate: date.clone(),
    writtenDate: date.clone(),
    description: 'tests added this tx',
    checkNum: 1,
    amount: 4000,
    credit: 4000,
    splitAmount: 0,
    balance: 0,
    who: 'Corn Buyer 1',
    category: 'sales-grain-corn',
    note: { bushels: 900 },
  };
  date.add(1, 'day'); // next day cattle sale
  const cattleSaleTx: AccountTx = {
    acct: bankrloc,
    lineno: cornSaleTx.lineno, // this will get inserted after corn sale, b/c the "lineno" is relative to the pre-insert state
    date: date.clone(),
    postDate: date.clone(),
    writtenDate: date.clone(),
    description: 'tests added this tx',
    checkNum: 2,
    amount: 55000,
    credit: 55000,
    splitAmount: 0,
    balance: 0,
    who: 'Cattle Processor 1',
    category: 'sales-cattle',
    note: { head: 35, weight: 49000, id: '2022-02-02_PROCESSOR1', loads: 1 },
  }
  date.add(1, 'day');
  const cattlePurchaseTx: AccountTx = {
    acct: bankchecking,
    lineno: bankchecking.lines[bankchecking.lines.length-1]!.lineno + 1,
    date: date.clone(),
    postDate: date.clone(),
    writtenDate: date.clone(),
    description: 'tests added this tx',
    checkNum: 3,
    amount: 130000,
    debit: 130000,
    splitAmount: 0,
    balance: 0,
    who: 'Feeder Raiser 1',
    category: 'cattle-purchase-cattle',
    note: { head: 260, weight: 78000, id: 'TPKA:FEB22-1', loads: 2, latecash: true },
  };
  date.add(1, 'day');
  // Put the dead card into Trello:
  await addTestDeadCardToTrello({ acct: livestock, date: date.clone() });

  // Put these three TX into their respective 2 accounts:
  await accounts.google.batchUpsertTx({ 
    acct: bankrloc,
    lines: [ cornSaleTx, cattleSaleTx ],
    insertOrUpdate: 'INSERT'
  });
  await accounts.google.pasteBalancesOrTemplate({ acct: bankrloc });

  await accounts.google.batchUpsertTx({
    acct: bankchecking,
    lines: [ cattlePurchaseTx ],
    insertOrUpdate: 'INSERT',
  });
  await accounts.google.pasteBalancesOrTemplate({ acct: bankchecking });


  const newledger = await accounts.google.reloadSomeAccountsFromGoogle({ accts: [ bankchecking, bankrloc ], finalaccts: ledger, status: info });
  if (!newledger) throw `Failed to reloadSomeAccountsFromGoogle after adding lines to bankchecking and bankrloc`;

  today = date.clone().add(1, 'day'); // Move "today" to "tomorrow" to get one new dailygain line for testing
  // Now when we run the inventory, we should have a missing corn sale ivty line, a missing 
  // cattle sale ivty line, a missing cattle purchase ivty line, and a missing dead ivtyline
  missing = await accounts.inventory.findMissingTx({ finalaccts: newledger, today });
  if (!missing) throw `findMissingTx returned falsey`;
  if (missing.length !== 2) {
    info('FAIL: missing = ', missing);
    throw `Had more than 2 inventory accounts with missing lines. There were ${missing.length} accounts`;
  }
  const cornmissing = missing.find(m => m.acct.name === 'inventory-grain-corn');
  if (!cornmissing) throw `Did not find inventory-grain-corn among list of inventory accounts with missing lines`;
  const cattlemissing = missing.find(m => m.acct.name === 'inventory-cattle');
  if (!cattlemissing) throw `Did not find inventory-cattle among list of inventory accounts with misisng lines`;

  if (cornmissing.missingInCash.length !== 0) throw `There should not have been any missingInCash lines for inventory-grain-corn, but there are ${cornmissing.missingInCash.length} instead`;
  if (cattlemissing.missingInCash.length !== 0) throw `There should not have been any missingInCash lines for inventory-cattle, but there are ${cattlemissing.missingInCash.length} instead`;
  if (cornmissing.presentInBothButOneIsWrong.length !== 0) throw `There should not have been any presentInBothButOneIsWrong lines for inventory-grain-corn, but there are ${cornmissing.presentInBothButOneIsWrong.length} instead`;
  if (cattlemissing.presentInBothButOneIsWrong.length !== 0) throw `There should not have been any presentInBothButOneIsWrong lines for inventory-cattle, but there are ${cattlemissing.presentInBothButOneIsWrong.length} instead`;
  if (cornmissing.missingInIvty.length !== 1) throw `There should have been one missingInIvty line for inventory-grain-corn, but there are ${cornmissing.missingInIvty.length} instead`;
  if (cattlemissing.missingInIvty.length !== 12) {
    info('cattlemissing.missingIvty = ', JSON.stringify(cattlemissing.missingInIvty,null,'  '));
    throw `There should have been 12 missingInIvty lines for inventory-cattle (one dead, one purchase, one sale, nine dailygain), but there are ${cattlemissing.missingInIvty.length} instead`;
  }

  // Now fix them
  await accounts.google.insertMissingIvtyTx(cornmissing);
  await accounts.google.insertMissingIvtyTx(cattlemissing);
  info('Inserted missing lines in cattle: ', cattlemissing);


  // Now reload the accounts again
  const insertedledger = await accounts.google.reloadSomeAccountsFromGoogle({ accts: [ cornmissing.acct, cattlemissing.acct ], finalaccts: newledger, status: info });
  if (!insertedledger) throw `FAIL: reloadSomeAccountsFromGoogle returned falsey`;

  // The new accounts should have nothing missing now
  missing = await accounts.inventory.findMissingTx({ finalaccts: insertedledger, today });
  if (!missing) throw `FAIL: missing returned falsey for findMissingTx on fixed ledger`;
  if (missing.length !== 0) {
    info('FAIL: missing = ', missing);
    throw `FAIL: expected no missing lines/accounts on fixed ledger, but found ${missing.length} instad`;
  }

  // Compute FIFO changes needed, then apply them:
  livestock = insertedledger.originals.find(a => a.name === 'inventory-cattle');
  assertLivestockInventoryAccount(livestock)
  let changes = accounts.inventory.livestock.computeLivestockFifoChangesNeeded(livestock);
  if (changes.length < 1) throw `Expected to have some changes needed for FIFO, but there were not any`;
  info('Applying changes as updates to inventory-cattle.  Changes =', changes);
  await accounts.google.applyLivestockFifoUpdates({ acct: livestock, lines: changes });

  // Now reload livestock account, and verify no missing tx and no changes needed:
  const fixedledger = await accounts.google.reloadSomeAccountsFromGoogle({ accts: [ livestock ], finalaccts: insertedledger, status: info });
  if (!fixedledger) throw `Failed to reloadSomeAccountsFromGoogle after updating livestock FIFO changes`;

  // Now when we run the inventory, we should have nothing missing
  missing = await accounts.inventory.findMissingTx({ finalaccts: fixedledger, today });
  if (!missing) throw `findMissingTx returned falsey`;
  if (missing.length !== 0) {
    info('FAIL: missing = ', missing);
    throw `Expected nothing missing, but had ${missing.length} accounts with missing lines instead`;
  }

  // And no changes needed:
  livestock = fixedledger.originals.find(a => a.name === 'inventory-cattle');
  assertLivestockInventoryAccount(livestock);
  changes = accounts.inventory.livestock.computeLivestockFifoChangesNeeded(livestock);
  if (changes.length !== 0) {
    info('FAIL: changes = ', changes);
    throw `FAIL: expected no changes needed for FIFO, but there were ${changes.length} instead`;
  }

  info('The test should be able to cleanup any lingering test dead cards');
  await deleteTestDeadCardFromTrelloIfExists({ acct: livestock });

  info('PASSED!!! Passed all browser-specific inventory tests');
}

async function addTestDeadCardToTrello({ acct, date }: { acct: Account, date: Moment }) {
  const trelloCardName = `${date.format('YYYY-MM-DD')}: TESTDEAD9 TESTDEAD10`;
  const trello = getTrelloClient();
  await trello.connect({ org: acct.settings.trelloOrg! });
  const boardid = await trello.findBoardidByName('Livestock');
  const deadlist = await trello.findListsAndCardsOnBoard({ boardid, listnames: [ 'Dead' ] });
  if (!deadlist[0]) throw `ERROR: Could not get dead listid from Trello!`;
  const idList = deadlist[0].id;  
  await trello.post('/cards', { idList, name: trelloCardName } );
}

async function deleteTestDeadCardFromTrelloIfExists({ acct }: { acct: Account }) {
  const trello = getTrelloClient();
  await trello.connect({ org: acct.settings.trelloOrg! });
  const boardid = await trello.findBoardidByName('Livestock');
  const lists = await trello.findListsAndCardsOnBoard({ boardid, listnames: [ 'Dead' ] });
  const dead = lists.find(l => l.name === 'Dead');
  if (!dead || !dead.cards) throw `ERROR: Could not get dead listid from Trello when looking to delete any test dead cards!`;
  for (const c of dead.cards) {
    if (c.name.match(/TESTDEAD/)) {
      info('Deleting existing dead card', c);
      await trello.delete(`/cards/${c.id}`, {});
    }
  }
}
