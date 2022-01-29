import _ from 'lodash';

//-----------------------------------------------------------
// Creating new things:
export const createFile = ({parentid=null,name,mimeType}) => window.gapi.client.drive.files.create({
  resource: { 
    name, 
    mimeType,
    parents: parentid ? [parentid] : [],
  },
  fields: 'id',
}).then(file => { console.log('returning file = ', file.result.id); return ({id: file.result.id}); })
.catch(e => { console.log('ERROR: google.createFile: failed to create file ',name); throw e; });

export const createFolder      = ({parentid=null,name}) => 
  createFile({parentid,name,mimeType: 'application/vnd.google-apps.folder'});

export const createSpreadsheet = ({parentid=null,name,worksheetName=false}) => {
  console.log('creating spreadsheet, calling createFile');
  return createFile({parentid,name,mimeType: 'application/vnd.google-apps.spreadsheet'})
  .then(({id}) => {
    console.log('worksheetName = ', worksheetName, ', id = ', id);
    if (!worksheetName) return {id};
    // If we have a worksheetName, add a worksheet with that name
    return window.gapi.client.sheets.spreadsheets.batchUpdate(
      { spreadsheetId: id },
      { requests: [ { addSheet: { properties: { title: worksheetName, index: 0 } } } ] }
    ).then(result => { console.log('After adding worksheet, result = ', result); return {id}; });
  });
};

//-----------------------------------------------------------
// Following paths...
export const findFileInFolder = ({id,name}) => window.gapi.client.drive.files.list({
       q: `name='${name}' and trashed=false and '${id}' in parents`,
  fileId: id,
  spaces: 'drive',
}).then(res => res.result.files)
.then(files => {
  if (files && files.length > 1) {
    console.log('findFileInfolder: Found more than 1 file ('+files.length+'), filtering for case-sensitive now');
    // Their search is case-insensitve so it will return all matches with same case.
    files = _.filter(files, f => f.name === name); // do our own case-sensitive search
    if (files.length > 1) {
      console.log('findFileInFolder: WARNING: Found '+files.length+' files with name ', name, ': ', files);
    }
  }
  if (!files || files.length < 1) {
    console.log('findFileInFolder: WARNING: Did not find folder', name);
    return null;
  }
  return files[0];
});

//-----------------------------------------------------------------------
// Given a path line /a/b/c, it will find the ID of the file at that path.
// Also can create the path if it does not exist.
const initalizing = {};
export const findFileAtPath = ({path,id='root',createIfNotExist=false,worksheetName=false}) => {
  if (!path || path.length < 1) { // path is empty, we're done
    return {id};
  }
  // If leading slash, this is root:
  if (path[0] === '/') path = path.slice(1); // just get rid of preceding slash since id defaults to 'root'
  const parts = _.split(path, '/');
  const name = parts[0]; // get the top one
  const rest = _.split(path, '/').slice(1);
  return findFileInFolder({id,name}).then(found => { // find it's info
    if (!found) {
      if (!createIfNotExist) {
        console.log('findFileAtPath: WARNING: searched for path '+path+', but found null');
        return { id:null };
      }
      // Otherwise, create this part of the path if it doesn't exist
      if (parts.length === 1) { // this is the spreadsheet at the bottom
        console.log('findFileAtPath: creating spreadsheet ',name, ' in parent id', id);
        return createSpreadsheet({name,parentid: id==='root' ? false:id,worksheetName})
        .then(result => { console.log('Created spreadsheet, result = ', result); return result; })
        .then(newid => ({id: newid.id})); // no need to recursively call again because this is bottom
      }
      // otherwise, this is a folder, create it
      console.log('findFileAtPath: creating folder ', name, ' in parent id ', id);
      return createFolder({name, parentid: id==='root' ? false:id,})
      .then(newid => findFileAtPath({ path: _.join(rest,'/'), id: newid.id, createIfNotExist, worksheetName}));
    }
    console.log('google.findFileAtPath: found ',name,', going down rest of path ',_.join(rest,'/'));
    return findFileAtPath({ path: _.join(rest,'/'), id: found.id, createIfNotExist, worksheetName});
  });
};

export const arrayToLetterRange = (row,arr) => {
  const startletter = 'A';
  let endletter = String.fromCharCode(65+arr.length);
  if (arr.length > 25) { // more than a single letter can represent
    const mostsig = String.fromCharCode(65+Math.trunc(arr.length/26)); // integer division
    const leastsig = String.fromCharCode(65+(arr.length%26)); // remainder
    endletter = mostsig+leastsig;
  }
  return startletter+row+':'+endletter+row;
};
