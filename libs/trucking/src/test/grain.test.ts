import type * as trucking from '../index.js';
import { getClient as getTrelloClient } from '@aultfarms/trello';
import debug from 'debug';

const info = debug('af/trucking#test/grain:info');

export default async function run(l: typeof trucking) {
  info('testing grain');

  info('Connecting to Trello');
  const client = getTrelloClient();

  const testorg = 'Ault Farms - TESTING';

  info('It should be able to "connect" to the test org', testorg);
  await client.connect({ org: testorg });

  info('It should be able to load all the records in the test org grain board');
  const result1 = await l.grain.grainBoard({ client });

  if (result1.errors.length > 0) {
    info('FAIL: could not get entire grain delivered board without errors.  Result = ', result1);
    throw new Error('Could not get grain board');
  }

  info('It should be able to save a new grain load card');
  const sl = result1.sellLists[0];
  if (!sl) throw new Error('There should be at least one sellerList in Trello.');
  let record: trucking.GrainRecord = {
    date: '2023-02-21',
    sellerList: sl.name,
    dest: 'TEST DEST',
    bushels: 123,
    ticket: '789',
    crop: 'CORN',
    driver: 'tester',
    note: 'note: '+(new Date()).toString(),
  };
  await l.grain.saveGrainDelivered({ client, record, idList: sl.idList });
  const result2 = await l.grain.grainBoard({ client, force: true });
  const lastcard = result2.sellLists[0]?.records.slice(-1)?.[0];
  try {
    if (!lastcard) throw new Error('ERROR: after saving new grain card, there are no cards in grain delivered list');
    if (lastcard.date !== record.date) throw new Error('Last card did not have same date as record we put');
    if (lastcard.dest !== record.dest) throw new Error('Last card did not have same source as record we put');
    if (lastcard.driver !== record.driver) throw new Error('Last card did not have same driver as record we put');
    if (lastcard.crop !== record.crop) throw new Error('Last card did not have same driver as record we put');
    if (lastcard.note !== record.note) throw new Error('Last card did not have same note as record we put');
  } catch(e: any) {
    info('Last card did not match: ', lastcard, '.  Record = ', record, ', grainBoard = ', result2);
    throw new Error('Failed to re-parse the grain load we saved earlier: '+e.toString());
  }


  info('All Grain Tests Passed');
}

