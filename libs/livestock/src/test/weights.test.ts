import type * as livestock from '../';
import * as google from '@aultfarms/google';
import { getClient as getTrelloClient } from '@aultfarms/trello';
import debug from 'debug';
import deepequal from 'deep-equal';

const info = debug('af/livestock#test/weights:info');

const pathroot = `/AF-AUTOMATEDTESTS/TEST-${+(new Date())}`;
info('Running tests against root path: ', pathroot);
const client = getTrelloClient();
const testorg = 'Ault Farms - TESTING';

type Livestock = typeof livestock;

export default async function weightsTest(l: Livestock) {
  info('library loads');
  await client.connect({ org: testorg });

  if (!l) throw 'Livestock lib is not ok, or could not connect to Trello';

  info('create new empty sheet');
  const basepath = pathroot;
  const year = '2023';
  const fetchResult = await l.weights.fetchYearWeights({ basepath, year });

  if (!fetchResult) throw `Failed to create test sheet at pathroot ${pathroot} (no result)`;
  if (!fetchResult.sheetinfo.worksheetName) throw `Sheetinfo had no worksheetName after creating`;
  if (!fetchResult.header) throw `Sheet had no header after creating`;

  const gsheet = await google.sheets.getSpreadsheet({ id: fetchResult.sheetinfo.id });
  if (!gsheet || !gsheet?.sheets) throw `Spreadsheet does not exist at the given id after fetchYearWeights`;

  info('saveWeightRow: fill out the empty sheet with some rows');
  const { sheetinfo, header } = fetchResult;
  const expectedTestRecords: livestock.WeightRecord[] = [];
  let weight: livestock.WeightRecord = {
    lineno: 2,
    weighdate: '2023-01-01',
    tag: { color: 'GREEN', number: 100 },
    weight: 1350,
    adj_wt: 1360,
    group: 'TEST:JAN22-1',
    in_date: '2021-09-29',
    days: 400,
    lbs_gain: 1060,
    rog: 2.65,
    sort: 'SELL'
  };
  for (let i=0; i < 10; i++) {
    expectedTestRecords.push(weight);
    await l.weights.saveWeightRow({ weight, header, sheetinfo });
    // Make a copy to use for next time:
    weight = {
      ...weight,
      lineno: weight.lineno+1, 
      tag: { ...weight.tag, number: weight.tag.number+1 },
      weight: weight.weight+1,
      adj_wt: weight.adj_wt+1,
    };
  }

  info('Fetch the records back from Google sheet and compare with expected');
  const r1 = await l.weights.fetchYearWeights({ sheetinfo });
  if (r1.weights.length !== expectedTestRecords.length) throw `Did not return same number of results (${r1.weights.length}) as we put in the sheet (${expectedTestRecords.length})`;
  for (const [index, r] of r1.weights.entries()) {
    if (!deepequal(r, expectedTestRecords[index])) {
      throw `Returned row object (${JSON.stringify(r,null,'  ')}) not same as what we put in: (${JSON.stringify(expectedTestRecords[index],null,'  ')})`;
    }
  }

  info('computeRow: blank row');
  const records = await l.records.fetchRecords(client);
  const row: livestock.WeightRecord = {
    lineno: 0,
    weighdate: '',
    tag: { color: '', number: 0 },
    weight: 0,
    adj_wt: 0,
    group: '',
    in_date: '',
    days: 0,
    lbs_gain: 0,
    rog: 0,
    sort: '',
  };
  let orig = { ...row }; // doesn't copy tag, but computeRow doesn't mess w/ tag.
  const r2 = l.weights.computeRow({ row, records });
  if (r2) throw `ERROR: expected computeRow to return false for blank row but it returned ${r2} instead'`;
  if (!deepequal(orig, row)) throw `ERROR: expected computeRow not to change row for blank row, but it did.`;

  info('computeRow: group not found');
  row.weighdate = '2023-03-01';
  row.lineno = 2;
  row.tag = { color: 'NOTGONNAFINDIT', number: 1 };
  orig = { ...row };
  try { 
    const r3 = l.weights.computeRow({ row, records });
    throw `ERROR: expected computeRow to throw for group not found but it returned ${r3} instead'`;
  } catch(e: any) {
  }
  if (!deepequal(orig, row)) throw `ERROR: expected computeRow not to change row for missing group, but it did.`;

  info('computeRow: find group from tag (not name)');
  row.tag.color = 'YELLOW';
  row.tag.number = 200;
  orig = { ...row, tag: { ...(row.tag) } };
  const r4 = l.weights.computeRow({ row, records });
  if (!r4) throw `ERROR: expected computeRow to change row with the group it found from tag, but it returned false.`;
  if (orig.group === row.group) throw `ERROR: expected computeRow to put a different group name on the row from the tag, but before and after group name is the same,`;

  info('computeRow: find group from group name');
  row.days = 0;
  const r5 = l.weights.computeRow({ row, records });
  if (!r5) throw `ERROR: expected computeRow to find group from group name and update the row object, but it returned false`;

  info('computeRow: tag w/o weight');
  row.weight = 0;
  const r6 = l.weights.computeRow({ row, records });
  if (r6) throw `ERROR: zero-weight returned truthy as changing the row`;
  if (row.weight !== 0) throw `ERROR: zero-weight was changed by computeRow to ${row.weight}`;

  info('computeRow: tag and weight');
  const wt = 1400;
  row.weight = wt;
  const r7 = l.weights.computeRow({ row, records });
  if (!r7) throw `ERROR: computeRow returned false, saying it did not change row with valid weight and tag`;
  // Quick check that computations continue to return the same things as they originally did:
  if (row.adj_wt !== wt * l.weights.adjFactor) throw `ERROR: computeRow wrong adj_wt`;
  if (row.days !== 424) throw `ERROR: computeRow days wrong`;
  if (row.group !== 'TPKA:JAN22-1') throw `ERROR: computeRow group wrong`;
  if (row.in_date !== '2022-01-01') throw `ERROR: computeRow in_date wrong`;
  if (row.lbs_gain !== 1128) throw `ERROR: computeRow lbs_gain wrong`;
  if (Math.abs(row.rog - 2.66) > 0.01) throw `ERROR: computeRow gain wrong`;

  info('recomputeAll and batchSaveWeightRows: change tag and weight on existing rows');
  const r8 = await l.weights.fetchYearWeights({ basepath, year });
  for (const row of r8.weights) {
    row.tag.color = 'YELLOW'; // change from GREEN to YELLOW which should match test group
    row.weight = 1400; // change weight from 1350 to 1400
  } 
  const before = { ...(r8.weights[1]!) };
  await l.weights.recomputeAll({ ...r8, records }); // weights were mutated in-place, so can re-used r8
  const afterInMemory = r8.weights[1]!;
  if (before.group === afterInMemory.group) throw `ERROR: recomputeAll failed to change group in memory`;
  if (before.in_date === afterInMemory.in_date) throw `ERROR: recomputeAll failed to change in_date in memory`;
  if (before.adj_wt === afterInMemory.adj_wt) throw `ERROR: recomputeAll failed to change adj_wt in memory`;
  if (before.lbs_gain === afterInMemory.lbs_gain) throw `ERROR: recomputeAll failed to change lbs_gain in memory`;
  if (before.rog === afterInMemory.rog) throw `ERROR: recomputeAll failed to change rog in memory`;
  if (before.days === afterInMemory.days) throw `ERROR: recomputeAll failed to change days in memory`;

  const r9 = await l.weights.fetchYearWeights({ sheetinfo });
  const after = r9.weights[1];
  if (!after) throw `ERROR: recomputeAll failed: after retrieving sheet there was no second record`;
  if (before.group === after.group) throw `ERROR: recomputeAll failed to change group in google`;
  if (before.in_date === after.in_date) throw `ERROR: recomputeAll failed to change in_date in google`;
  if (before.adj_wt === after.adj_wt) throw `ERROR: recomputeAll failed to change adj_wt in google`;
  if (before.lbs_gain === after.lbs_gain) throw `ERROR: recomputeAll failed to change lbs_gain in google`;
  if (before.rog === after.rog) throw `ERROR: recomputeAll failed to change rog in google`;
  if (before.days === after.days) throw `ERROR: recomputeAll failed to change days in google`;

  info('weights tests: All successful.')
}

