import type * as Trello from '../index.js';
import debug from 'debug';

const info = debug('af/trello#test/livestock:info');

export default async function run(client: Trello.client.Client, t: typeof Trello) {
  info('testing trello livestock ');
  const testorg = 'Ault Farms - TESTING';

  info('It should be able to "connect" to the test org', testorg);
  await client.connect({ org: testorg });

  info('It should be able to load all the records in the test org livestock board');
  const result1 = await t.livestock.fetchRecords(client);

  if (result1.dead.errors.length > 0) {
    info('FAIL: dead = ', result1.dead);
    throw new Error('Dead records had errors');
  }
  if (result1.dead.records.length < 1) {
    info('FAIL: dead = ', result1.dead);
    throw new Error('Dead had no records');
  }
  if (result1.incoming.errors.length > 0) {
    info('FAIL: incoming = ', result1.incoming);
    throw new Error('Dead records had errors');
  }
  if (result1.incoming.records.length < 1) {
    info('FAIL: incoming = ', result1.incoming);
    throw new Error('Dead had no records');
  }
  if (result1.treatments.errors.length > 0) {
    info('FAIL: treatments = ', result1.treatments);
    throw new Error('Dead records had errors');
  }
  if (result1.treatments.records.length < 1) {
    info('FAIL: treatments = ', result1.treatments);
    throw new Error('Dead had no records');
  }



  info('All Trello Livestock Tests Passed');
}

