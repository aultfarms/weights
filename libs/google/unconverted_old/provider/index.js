import { Provider, CerebralError } from 'cerebral';
import Promise from 'bluebird';
import { findFileAtPath, arrayToLetterRange } from './util';

let isAuthorized = false;

class GoogleFileNotFoundError extends CerebralError {};

const waitUntilLoaded = new Promise((resolve, reject) => {
  let count = 0;
  const check = () => {
    if (window.gapi) return resolve();
    if (count++ > 50) return reject('Could not load Google client library');
    setTimeout(check, 250);
  };
  return check();
});

export default Provider({
  //--------------------------------------------
  // Authorize must be called before anything else
  authorize: () => waitUntilLoaded.then(() => {
    if (isAuthorized) return true;
    window.gapi.loadAsync = Promise.promisify(window.gapi.load);
    return window.gapi.loadAsync('client')
    .then(() => window.gapi.client.init({
      apiKey: 'AIzaSyD57I9jyE6PB4QEZ5J7goi8oiEbN_N4Jgc', // this is only used for any unauthenticated requests, not really needed here
      clientId: '1090081130077-ffhfsld25cob0ci8p7d763lmfkh0ng1v.apps.googleusercontent.com',
      discoveryDocs: [ 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', 'https://sheets.googleapis.com/$discovery/rest?version=v4' ],
      scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
      immediate: true,
    })).then(() => {
      if (window.gapi.auth2.getAuthInstance().isSignedIn.get()) return Promise.resolve();
      return window.gapi.auth2.getAuthInstance().signIn();
    });
  }),
  deauthorize: () => {
    window.gapi.auth2.getAuthInstance().signOut();
    isAuthorized = false;
  },

  idFromPath: ({path,createIfNotExist=false,worksheetName=false}) => findFileAtPath({path,createIfNotExist,worksheetName}).then(result => {
    console.log('returned from findFileAtPath, result = ', result);
    if (!result || !result.id) throw new GoogleFileNotFoundError('Could not find file at path '+path);
    return {id:result.id};
  }),

  getAllRows: ({id,worksheetName}) => window.gapi.client.sheets.spreadsheets.values.get({ 
    spreadsheetId: id, 
    range: worksheetName+'!A:ZZ',
  }).then(res => { 
    console.log('getAllRows finished, result = ', res); return res;
  }).then(res => ({ values: res.result.values })),

  putRow: ({id,row,cols,worksheetName}) => {
    const range = worksheetName+'!'+arrayToLetterRange(row,cols);
    const params = {
      spreadsheetId: id,
      range: worksheetName+'!'+arrayToLetterRange(row,cols),
      valueInputOption: 'RAW', //'USER_ENTERED',
      includeValuesInResponse: true,
    };
    const data = {
      range: worksheetName+'!'+arrayToLetterRange(row,cols),
      majorDimension: 'ROWS',
      values: [ cols ],
    };
    return window.gapi.client.sheets.spreadsheets.values.update(params, data)
    .then(result => result.result.updatedData.values[0]);
  },

})

