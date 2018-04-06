import moment from 'moment';
import _ from 'lodash';
import { set,increment } from 'cerebral/operators';
import { state,props } from 'cerebral/tags';
import { sequence } from 'cerebral';

import { tagStrToObj } from '../../util/tagHelpers';
import * as google from '../../google/module/sequences';

//---------------------------------------------------------------------
// clear the cache of weight records
export const clearCache = sequence('weights.clearCache', [
  set(state`weights.records`, []),
]);

//-------------------------------------------------------------------
// set a row in the spreadsheet and update the cache from the response
// need to have at least props.row, props.cols
export const putRow = sequence('weights.putRow', [
  ({props,state}) => ({
    key: props.key || state.get(`weights.sheet.key`),
    id: props.id || state.get(`weights.sheet.id`),
    worksheetName: props.worksheetName || state.get(`weights.sheet.worksheetName`),
  }),
  google.putRow, // save to google, then update our copy from resulting props.values
  ({state,props}) => {
    const record = weightRowToRecordMapper(props.values,props.row-1);
    if (!record) return; // header row
    return state.set(`weights.records.${props.row}`, weightRowToRecordMapper(props.values,props.row-1))
  },
]);

// need props.row, will fill in the rest from the state
export const saveRecordRow = sequence('weights.saveRecordRow', [
  ({props,state}) => ({ cols: weightRecordToRowMapper(state.get(`weights.records.${props.row}`)) }),
  increment(props`row`), // increment to account for header row when putting
  putRow,
  increment(props`row`,-1), // move back to zero-index in case we forget and add stuff here someday
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
  ({props,state}) => state.set(`weights.sheet`, { id: props.id, key: props.key, worksheetName: props.worksheetName }),

  // check if we have at least a header row.  If not, make one:
  ({props,state,path}) => {
    const sheet = state.get(`google.sheets.${props.key}`);
    if (sheet.rows && sheet.rows.length > 0) return path.haveHeader();
    return path.addHeader({id: sheet.id, worksheetName: sheet.worksheetName});
  },
  { 
    haveHeader: [],
    addHeader: [
      ({props}) => ({id: props.id, worksheetName: props.worksheetName, key: props.key,
        row: 0, 
        cols: [ 'color', 'number', 'weight', 'adj_wt', 'group', 'in_date', 'days', 'lbs_gain', 'rog' ],
      }),
      putRow,
      () => console.log('weights: Added header row to weights sheet'),
    ],
  },

  // convert the google sheets rows to records and store in state for weights
  ({props,state}) => state.set('weights.records', 
    _.reduce(state.get(`google.sheets.${props.key}.rows`), weightRowToRecordReducer, [])
  ),
]);


