import type * as trucking from '../index.js';
import { getClient as getTrelloClient } from '@aultfarms/trello';
import debug from 'debug';

const info = debug('af/trucking#test/feed:info');

export default async function run(l: typeof trucking) {
  info('testing feed');

  info('Connecting to Trello');
  const client = getTrelloClient();

  const testorg = 'Ault Farms - TESTING';

  info('It should be able to "connect" to the test org', testorg);
  await client.connect({ org: testorg });

  info('It should be able to load all the records in the test org feed board');
  const result1 = await l.feed.feedBoard({ client, name: 'Feed - TEST' });

  if (result1.errors.length > 0) {
    info('FAIL: could not get entire feed delivered board without errors.  Result = ', result1);
    throw new Error('Could not get feed board');
  }

  info('It should be able to save a new feed load card');
  let record: trucking.FeedRecord = {
    date: '2023-02-21',
    source: 'TEST SOURCE', // note: library does toUpperCase on this
    loadNumber: '1',
    dest: 'TEST DEST', // note: library does toUpperCase on this
    weight: 12345,
    driver: 'tester',
    note: 'note: '+(new Date()).toString(),
  };
  await l.feed.saveFeedDelivered({ client, record });
  const result2 = await l.feed.feedBoard({ client, force: true });
  const lastcard = result2.delivered.records.slice(-1)?.[0];
  try {
    if (!lastcard) throw new Error('ERROR: after saving new feed card, there are no cards in feed delivered list');
    if (lastcard.date !== record.date) throw new Error('Last card did not have same date as record we put');
    if (lastcard.source !== record.source) throw new Error('Last card did not have same source as record we put');
    if (lastcard.driver !== record.driver) throw new Error('Last card did not have same driver as record we put');
    if (lastcard.note !== record.note) throw new Error('Last card did not have same note as record we put');
  } catch(e: any) {
    info('Last card did not match: ', lastcard, '.  Record = ', record, ', feedBoard = ', result2);
    throw new Error('Failed to re-parse the feed load we saved earlier: '+e.toString());
  }

  info('It should be able to add an available load number to Trello');
  await l.feed.saveAvailableLoadNumber({ client, loadnumstr: 'Cie 12345' });
  const result3 = await l.feed.feedBoard({ client, force: true });
  const lastcard2 = result3.available.records.slice(-1)?.[0];
  try {
    if (!lastcard2) throw new Error('ERROR: after saving new feed card, there are no cards in feed delivered list');
    if (lastcard2.name !== 'Cie 12345') throw new Error('Last card did not have same load number as record we put');
  } catch(e: any) {
    info('Last card did not match: ', lastcard2, '. feedBoard = ', result3);
    throw new Error('Failed to re-parse the available load number we saved earlier: '+e.toString());
  }

  info('It should be able to update an existing available load number')
  record.loadNumber = lastcard2.name; // Cie 12345
  record.id = lastcard2.id;
  await l.feed.saveFeedDelivered({ client, record });
  const result5 = await l.feed.feedBoard({ client, force: true });
  let stillAvailable = result5.available.records.find(r => r.name === 'Cie 12345');
  if (!!stillAvailable) throw new Error('ERROR: after saving new feed card from existing available number, the original available card is still in the available list');
  let resultingRecord = result5.delivered.records.find(r => r.id === record.id);
  if (!resultingRecord) throw new Error('ERROR: after saving new feed card from existing available number, the original available card is not in the delivered list');

  info('It should be able to enter a new number for a supplier with existing numbers');
  // Save some numbers for CIE to the list
  await l.feed.saveAvailableLoadNumber({ client, loadnumstr: 'Cie 12346' });
  await l.feed.saveAvailableLoadNumber({ client, loadnumstr: 'Cie 12347' });
  const orig = await l.feed.feedBoard({ client, force: true });
  let loadNumber = '12348';
  record = {
    date: '2023-02-21',
    source: 'Cie', // note: library does toUpperCase on this
    loadNumber,
    dest: 'TEST DEST', // note: library does toUpperCase on this
    weight: 12348,
    driver: 'tester',
    note: 'note: '+(new Date()).toString(),
  };
  await l.feed.saveFeedDelivered({ client, record });
  const result6 = await l.feed.feedBoard({ client, force: true });
  if (orig.available.records.length !== result6.available.records.length) {
    throw new Error('ERROR: after saving new feed card with new number, the number of avialble cards changed and it should not have changed');
  }
  resultingRecord = result6.delivered.records.find(r => r.loadNumber === loadNumber);
  if (!resultingRecord) throw new Error('ERROR: after saving new feed card with a new number for a supplier with existing numbers, the original available card is not in the delivered list');


  info('All Feed Tests Passed');
}