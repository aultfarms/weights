import { state, sequence, CerebralError } from 'cerebral';
import { set } from 'cerebral/factories';

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
  ({google,props,store}) => google.putRow({ 
    id: props.id, 
    row: props.row+1,  // google is 1-indexed, before now we are 0-indexed
    cols: props.cols, 
    worksheetName: props.worksheetName 
  }).then(values => { // update the row in our cache with this copy
    store.set(state`google.sheets.${props.key}.rows.${props.row}`, values);
    return { values };
  }),
]);

//--------------------------------------------------------------
// loadSheet sequence: given a path to a sheet, find that sheet
// load it's rows into the state 
// props = { drivePath, key, worksheetName } the sheet's data will be put at google.sheets.<key>
export const loadSheetRows = sequence('google.loadSheetRows', [
  ({store,props,google,get}) => {
    if (props.id) return; // if we already have a sheetid in props, no need to look for one
    if (!props.path) return; // no path passed!
    const pathkey = props.path; //props.path.replace(/\//g,'__').replace(/ /g,'_').replace(/-/g,'_'); // cerebral doesn't like forward slashes in key names
    const id = get(state`google.knownPaths.${pathkey}`);
    if (id) return {id}; // otherwise, check store, add to props
    return google.idFromPath({  // otherwise, we need to go ask google about it
      path: props.path, 
      createIfNotExist: props.createIfNotExist || false,
      worksheetName: props.worksheetName || false
    }).then(({id}) => {
      store.merge(state`google`, { knownPaths: { [pathkey]: id } });
      return {id};
    });
  },

  ({google,props}) => google.getAllRows({ 
    id: props.id, 
    worksheetName: props.worksheetName 
  }), // goes into props.values

  ({store,props}) => store.set(state`google.sheets.${props.key}`, {
    worksheetName: props.worksheetName,
    id: props.id,
    key: props.key,
    rows: props.values
  }),
]);


