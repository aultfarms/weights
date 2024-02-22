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
  const result1 = await l.feed.feedBoard({ client });

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


  info('All Feed Tests Passed');
}

