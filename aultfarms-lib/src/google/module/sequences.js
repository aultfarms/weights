import { sequence, CerebralError } from 'cerebral';
import { state } from 'cerebral/tags';
import { set } from 'cerebral/operators';

class GoogleAuthorizeError extends CerebralError {};

//-----------------------------------------------
// authorize and deauthorize
export const authorize = [
  ({google}) => google.authorize().catch(e => { throw new GoogleAuthorizeError(e) }),
  set(state`google.authorized`, true),
];

export const deauthorize = [
  set(state`google.authorized`, false),
  sequence('deauthorize->authorize', authorize),
];

// expects props.id for spreadsheet id, 
//         props.worksheetName, 
//         props.row for which row, 
//         props.cols for columns,
//         props.key for which sheet key to use
export const putRow = sequence('google.putRow', [ 
  ({google,props,state}) => google.putRow({ 
    id: props.id, 
    row: props.row+1,  // google is 1-indexed, before now we are 0-indexed
    cols: props.cols, 
    worksheetName: props.worksheetName 
  }).then(values => { // update the row in our cache with this copy
    state.set(`google.sheets.${props.key}.rows.${props.row}`, values);
    return { values };
  }),
]);

//--------------------------------------------------------------
// loadSheet sequence: given a path to a sheet, find that sheet
// load it's rows into the state 
// props = { drivePath, key, worksheetName } the sheet's data will be put at google.sheets.<key>
export const loadSheetRows = sequence('google.loadSheetRows', [
  ({state,props,google}) => {
    if (props.id) return; // if we already have a sheetid in props, no need to look for one
    const id = state.get(`google.knownPaths.${props.path}`);
    if (id) return {id}; // otherwise, check state, add to props
    return google.idFromPath({  // otherwise, we need to go ask google about it
      path: props.path, 
      createIfNotExist: props.createIfNotExist || false,
      worksheetName: props.worksheetName || false
    }).then(({id}) => {
      state.set(`google.knownPaths.${props.path}`, id);
      return {id};
    });
  },

  ({google,props}) => google.getAllRows({ 
    id: props.id, 
    worksheetName: props.worksheetName 
  }), // goes into props.values

  ({state,props}) => state.set(`google.sheets.${props.key}`, {
    worksheetName: props.worksheetName,
    id: props.id,
    key: props.key,
    rows: props.values
  }),
]);


