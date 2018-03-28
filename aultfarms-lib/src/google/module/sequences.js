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


//--------------------------------------------------------------
// loadSheet sequence: given a path to a sheet, find that sheet
// load it's rows into the state 
// props = { drivePath, key, worksheetName } the sheet's data will be put at google.sheets.<key>
export const loadSheetRows = [
  sequence('loadSheet->authorize', authorize),
  ({google,props}) => google.idFromPath(props.path),
  ({google,props}) => google.getAllRows({ id: props.id, worksheetName: props.worksheetName }), // goes into props.values
  ({state,props}) => state.set(`google.sheets.${props.key}`, {
    worksheetName: props.worksheetName,
    id: props.id,
    rows: props.values
  })
];


