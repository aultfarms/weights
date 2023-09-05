import dayjs from 'dayjs';
import * as google from '@aultfarms/google';
import debug from 'debug';
import type { WeightRecord, ErrorWeight, SpreadsheetInfo, GroupWeightStats, WeightRecordsInfo, LivestockRecords } from './types.js';
import { assertWeightRecord } from './types.js';
import oerror from '@overleaf/o-error';
import {groupForTag} from './util.js';
import type {RowObject} from '../../google/dist/sheets.js';

const info = debug('af/livestock#weights:info');
const warn = debug('af/livestock#weights:warn');

export let adjFactor = 1.02;
export function setAdjFactor(a: number) { adjFactor = a; }

export const header = [ 
  'weighdate', 'color', 'number', 'weight', 'adj_wt', 
  'group', 'in_date', 'days', 'lbs_gain', 
  'rog', 'sort' 
];

export const sorts = [
  'SELL', 'HEAVY', 'KEEP', 'JUNK', 'SPECIAL'
];

export const defaultBasepath = '/Ault Farms Shared/LiveData/Weights';

export async function fetchYearWeights({ basepath, year, sheetinfo }: { basepath?: string, year?: string | number, sheetinfo?: SpreadsheetInfo }): Promise<WeightRecordsInfo> {
  if (!sheetinfo) {
    if (!basepath) basepath = `/Ault Farms Shared/LiveData/Weights`;
    if (!year) year = dayjs().year();
    const path = `${basepath}/${year}_Weights`;
    const worksheetName = 'weights';

    // Make sure we have a spreadsheet and get it's info:
    const s = await google.sheets.ensureSpreadsheet({ path, worksheetName });
    if (!s) {
      warn('ERROR: could not ensure spreadsheet.');
      throw new Error('ERROR: could not ensure spreadsheet at path: '+path);
    }
    sheetinfo = {
      id: s.id, path, worksheetName
    };
  }

  // Grab all the rows as JSON objects:
  let jsonRecords = await google.sheets.sheetToJson(sheetinfo);

  // If we had no header, put one on the sheet:
  if (!jsonRecords || !jsonRecords.header || jsonRecords.header.length < 1) {
    info('There is no header on the sheet yet, putting one on');
    await google.sheets.putRow({ ...sheetinfo, row: '1', cols: header });
    jsonRecords = await google.sheets.sheetToJson(sheetinfo);
    if (!jsonRecords ||  !jsonRecords.header) {
      warn('After putting a header on the sheet, sheetToJson still did not return a header');
      throw new Error('ERROR: after putting a header on the sheet, sheetToJson still did not return a header');
    }
  }

  // Change the "color" and "number" into a tag object, convert strings to numbers:
  // add lineno and sheetinfo
  for (const [index, r] of jsonRecords.data.entries()) {
    r.lineno = index + 2; // +2 b/c of 1-based index and header row
    r.weight = +(r.weight) || 0;
    r.adj_wt = +(r.adj_wt) || 0;
    r.days = +(r.days) || 0;
    r.lbs_gain = +(r.lbs_gain) || 0;
    r.rog = +(r.rog) || 0;
    if (r.color && r.number) {
      r.tag = { color: r.color, number: +(r.number) };
      delete r.color;
      delete r.number;
    }
  }

  // Validate the weight records:
  const weights: WeightRecord[] = [];
  const errors: ErrorWeight[] = [];
  for (const [index, w] of jsonRecords.data.entries()) {
    try {
      assertWeightRecord(w);
      weights.push(w);
    } catch(e: any) {
      warn('ERROR: Line',index+2,'of',sheetinfo.path,': not valid.  Row was:',w,'Error was:',e);
      // ErrorWeight:
      errors.push({
        lineno: index+2,
        sheetinfo,
        row: w,
        error: e,
        msg: `ERROR: Line ${index+2} of ${sheetinfo.path}: was not a valid weight record.  Error was: `+e.toString(),
      });
    }
  }

  // Done!
  return {
    sheetinfo,
    header: jsonRecords.header,
    weights,
    errors,
  };
};

export async function saveWeightRow({
  weight, header, sheetinfo
}: {
  weight: WeightRecord, header: string[], sheetinfo: SpreadsheetInfo,
}) {

  // Convert the record to a row of strings in the order the spreadsheet has them:
  const cols: string[] = [];
  for (const h of header) {
    if (h === 'weighdate') cols.push(weight.weighdate || '');
    if (h === 'color') cols.push(weight.tag.color || '');
    if (h === 'number') cols.push(weight.tag.number.toString() || '');
    if (h === 'weight') cols.push(weight.weight.toString() || '');
    if (h === 'adj_wt') cols.push(weight.adj_wt.toString() || '');
    if (h === 'group') cols.push(weight.group || '');
    if (h === 'in_date') cols.push(weight.in_date || '');
    if (h === 'days') cols.push(weight.days.toString() || '');
    if (h === 'lbs_gain') cols.push(weight.lbs_gain.toString() || '');
    if (h === 'rog') cols.push(weight.rog.toString() || '');
    if (h === 'sort') cols.push(weight.sort || '');
  }

  // Put the data to the spreadsheet:
  try {
    await google.sheets.putRow({
      ...sheetinfo, // id and worksheetName
      row: weight.lineno.toString(),
      cols,
      rawVsUser: 'USER_ENTERED',
    });
  } catch(e: any) {
    warn('ERROR: could not put row to sheet.  Row:',weight.lineno,', cols:',cols,', Error:',e);
    throw oerror.tag(e, 'ERROR: failed to put row to sheet.  Error was:'+e.toString());
  }
}


function updateGroupStat(group: string, weight: WeightRecord, stats: GroupWeightStats) {
  if (!stats[group]) {
    stats[group] = {
      lbsGain: 0,
      days: 0,
      adj_wt: 0,
      count: 0,
    };
  }
  const s = stats[group]!;
  s.lbsGain += weight.lbs_gain,
  s.days += weight.days,
  s.adj_wt += weight.adj_wt,
  s.count++;
}


// I need to figure out stats.  These are inter-related.
// We have sorts, today, this month, this year, but we also 
// can just sort up everything by the day, month, year and let the
// caller decide which is "today" and "this month".  BUT,
// the sorts will have to be for each day, month, and year.
// Maybe write out an example??
// I want to see:
// - All, sell, heavy, etc. for today...
// - % of sell for today (w/ +/- on % for year)
// - Counts/% of all weight groups for today (w/ +/- on % for year)
// - Compare incoming group ROG and weights with each other
// - See what % of today's weights are from each group
// - Do I want to compare years?
// - Let's get this library done, then come back to this when we make it to the app.
export function computeStats(weights: WeightRecord[]) {
  const sorts: GroupWeightStats = {};
  const incoming: GroupWeightStats = {};
  const sources: GroupWeightStats = {};
  const ranges: GroupWeightStats = {};
  const days: GroupWeightStats = {};
  const months: GroupWeightStats = {};
  const years: GroupWeightStats = {};

  for (const w of weights) {
    const range = Math.floor(w.adj_wt / 100) * 100;
    const source = (w.group || 'UNKNOWN').split(':')[0] || 'UNKNOWN';
    updateGroupStat(w.group || 'UNKNOWN', w, incoming);
    updateGroupStat(source, w, sources);
    updateGroupStat(w.sort,w, sorts);
    updateGroupStat(range+'',w, ranges);
    updateGroupStat(w.weighdate, w, days);
    const d = dayjs(w.weighdate, 'YYYY-MM-DD');
    if (d.isValid()) {
      updateGroupStat(d.format('YYYY-MM'), w, months);
      updateGroupStat(d.format('YYYY'), w, years);
    }
  }
  return { incoming, sorts, ranges, days, months, years };
}

// This mutates the row:
export function computeRow({ row, records, recheckTagGroup }: { row: WeightRecord, records: LivestockRecords, recheckTagGroup?: boolean }) {
  let changed: boolean = false;

  // Must have at least tag, weighdate
  if (!row.tag) return false;
  if (!row.weighdate || !row.weighdate.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) return false;

  // Now figure out the incoming group and validate it:
  let incoming = records.incoming.records.find(r => r.groupname === row.group);
  if (!incoming || recheckTagGroup) incoming = groupForTag(records, row.tag) || undefined;
  if (!incoming) {
    warn('ERROR: Could not find incoming record from name (',row.group, ') or from tag (',row.tag.color,row.tag.number,')');
    throw new Error(`ERROR: Could not find incoming record from name (${row.group}) or from tag (${row.tag.color+row.tag.number})`);
  }
  let arrive = dayjs(row.in_date, 'YYYY-MM-DD');
  if (!row.in_date || recheckTagGroup) {
    arrive = dayjs(incoming.date, 'YYYY-MM-DD');
  }
  const weighdate = dayjs(row.weighdate, 'YYYY-MM-DD');
  if (!arrive.isValid() || !weighdate.isValid()) {
    warn('ERROR: arrival date (',row.in_date,') or weighdate (',row.weighdate,') could not be turned into valid date');
    throw new Error(`ERROR: arrival date (${row.in_date}) or weigh date (${row.weighdate}) could not be turned into valid date`);
  }
  const arrive_str = arrive.format('YYYY-MM-DD');

  // Now check for and make changes:
  if (incoming.groupname !== row.group) {
    changed = true;
    row.group = incoming.groupname;
  }
  const adj_wt = adjFactor * row.weight;
  if (adj_wt !== row.adj_wt) {
    changed = true;
    row.adj_wt = adj_wt;
  }
  if (row.in_date !== arrive_str) {
    changed = true;
    row.in_date = arrive_str;
  }
  const days = Math.abs(Math.round(weighdate.diff(arrive,'days')));
  if (row.days !== days) {
    changed = true;
    row.days = days;
  }
  if (!incoming.weight) {
    warn('ERROR: incoming group (',incoming.groupname, ') from card (',incoming.cardName, ') has no weight!');
  } else { 
    // Can only compute gain if we actually have a weight
    if (row.adj_wt) {
      const lbs_gain = row.adj_wt - incoming.weight
      if (row.lbs_gain !== lbs_gain) {
        changed = true;
        row.lbs_gain = lbs_gain;
      }
    }
  }
  if (row.lbs_gain && row.days) {
    const rog = row.lbs_gain / row.days;
    if (Math.abs(rog - row.rog) > 0.01) {
      changed = true;
      row.rog = rog;
    }
  }
  return changed;
}

export async function batchSaveWeightRows({ sheetinfo, weights, header }: {
  sheetinfo: SpreadsheetInfo, weights: WeightRecord[], header: string[]
}) {
  // Flatten tag object back out:
  const rows: RowObject[] = weights.map(w => {
    const { tag, ...rest } = w; // get tag out of w (rest of object is flat)
    const r: RowObject = rest; // Tell typescript we want a RowObject
    r.color = w.tag.color;
    r.number = w.tag.number;
    return r;
  });

  await google.sheets.batchUpsertRows({
    ...sheetinfo,
    rows,
    header,
    insertOrUpdate: 'UPDATE'
  });
}

export async function recomputeAll({ weights, sheetinfo, header, records }: WeightRecordsInfo & { records: LivestockRecords }) {
  const changes: WeightRecord[] = [];
  for (const row of weights) {
    const isChanged = computeRow({ row, records, recheckTagGroup: true });
    if (isChanged) changes.push(row);
  }
  return batchSaveWeightRows({ sheetinfo, weights: changes, header });
}
