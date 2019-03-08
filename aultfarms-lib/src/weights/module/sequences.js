import moment from 'moment';
import _ from 'lodash';
import { set,increment } from 'cerebral/factories';
import { sequence,state,props } from 'cerebral';

import { tagStrToObj } from '../../util/tagHelpers';
import * as google from '../../google/module/sequences';

export const computeStats = sequence('weights.computeStats', [
  ({get,store}) => {
    const heavylimit = get(state`weights.filters.heavy.limit`);
    const records = get(state`weights.records`);
    const heavyhead = _.filter(records, r => r.weight && r.weight > heavylimit).length;
    store.set(state`weights.filters.heavy.count`, heavyhead);
console.log('records = ', records);
    const stats = _.reduce(records, (acc,r) => { 
      if (!r.sort || !r.adjWeight || !r.tag) return acc;

      const which = acc[r.sort]; // SELL, KEEP, HEAVY, JUNK
      which.lbsGain += r.lbsGain || 0; 
      which.days += r.days || 0; 
      which.adjWeight += r.adjWeight;
      which.count++;
      const all = acc.ALL;
      all.lbsGain += r.lbsGain || 0; 
      all.days += r.days || 0; 
      all.adjWeight += r.adjWeight;
      all.count++;

      return acc; 
    }, {
           ALL: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
          SELL: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
         HEAVY: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
          KEEP: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
          JUNK: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
      SPECIAL1: { lbsGain: 0, days: 0, adjWeight: 0, count: 0 },
    });
    store.set(state`weights.stats`, stats);
  },

]);



//---------------------------------------------------------------------
// clear the cache of weight records
export const clearCache = sequence('weights.clearCache', [
  set(state`weights.records`, []),
  computeStats, // clear stats too
]);

//-------------------------------------------------------------------
// set a row in the spreadsheet and update the cache from the response
// need to have at least props.row, props.cols
export const putRow = sequence('weights.putRow', [
  ({props,store,get}) => ({
    key: props.key || get(state`weights.sheet.key`),
    id: props.id || get(state`weights.sheet.id`),
    worksheetName: props.worksheetName || get(state`weights.sheet.worksheetName`),
  }),
  increment(props`row`),    // move to Google's 1-index
  google.putRow, // save to google, then update our copy from resulting props.values
  increment(props`row`,-1), // move back to our zero-index 
  ({store,props}) => {
    const record = weightRowToRecordMapper(props.values,props.row);
    if (!record) return; // header row
    return store.set(state`weights.records.${props.row}`, weightRowToRecordMapper(props.values,props.row))
  },
  computeStats,
]);


// need props.row, will fill in the rest from the state
export const saveRecordRow = sequence('weights.saveRecordRow', [
  ({props,get}) => ({ cols: weightRecordToRowMapper(get(state`weights.records.${props.row}`)) }),
  putRow,
  // don't need to computeStats because putRow does that above
]);



//---------------------------------------------------------------------
// fetch all weight records for a particular day:
function weightRecordToRowMapper(record) {
  return [
    record.tag ? record.tag.color : '',
    record.tag ? record.tag.number : '',
    record.weight ? record.weight : '',
    record.adjWeight ? record.adjWeight : '',
    record.group ? record.group : '',
    record.inDate ? record.inDate : '',
    record.days ? record.days : '',
    record.lbsGain ? record.lbsGain : '',
    record.rog ? record.rog : '',
    record.sort ? record.sort : 'SELL',
  ];
}
function weightRowToRecordMapper(row,index) {
  if (index === 0) return; // row 0 is header
  return {
    tag: {
        color:   row[0],
       number: +(row[1]),
    },
       weight: +(row[2]),
    adjWeight: +(row[3]),
        group:   row[4],
       inDate:   row[5],
         days: +(row[6]),
      lbsGain: +(row[7]),
          rog: +(row[8]),
         sort: row[9],
          row: index,
  };
}
function weightRowToRecordReducer(acc,row,index) {
  if (index > 0)  // ignore header row
    acc.push(weightRowToRecordMapper(row,index));
  return acc;
}
export const fetch = sequence('weights.fetch', [
  ({props}) => ({ 
    path: `/Ault Farms Shared/LiveData/Weights/${props.date}_Weights`, 
    createIfNotExist: true,
    worksheetName: 'weights',
    key: `${props.date}_Weights`
  }),
  // get everything from Google
  google.loadSheetRows,
  // keep track of sheet meta info
  ({props,store}) => store.set(state`weights.sheet`, { id: props.id, key: props.key, worksheetName: props.worksheetName }),

  // check if we have at least a header row.  If not, make one:
  ({props,store,path,get}) => {
    const sheet = get(state`google.sheets.${props.key}`);
    if (sheet.rows && sheet.rows.length > 0) return path.haveHeader();
    return path.addHeader({id: sheet.id, worksheetName: sheet.worksheetName});
  },
  { 
    haveHeader: [],
    addHeader: [
      ({props}) => ({id: props.id, worksheetName: props.worksheetName, key: props.key,
        row: -1,  // putRow will increment expecting to move past header
        cols: [ 'color', 'number', 'weight', 'adj_wt', 'group', 'in_date', 'days', 'lbs_gain', 'rog', 'sort' ],
      }),
      putRow,
      () => console.log('weights: Added header row to weights sheet'),
    ],
  },

  // convert the google sheets rows to records and store in state for weights
  ({props,store,get}) => store.set(state`weights.records`, 
    _.reduce(get(state`google.sheets.${props.key}.rows`), weightRowToRecordReducer, [])
  ),
  computeStats,
]);

export const changeHeavyLimit = sequence('changeHeavyLimit', [ 
  set(state`weights.filters.heavy.limit`, props`limit`),
  computeStats,
]);
