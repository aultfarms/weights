// Sadly, gapi-script library did not work for me, I had to grab the thing from google myself 
// and then follow how gapi-script did it to get it loading statically w/ types
import debug from 'debug';

// load window.gapi
import "./gapi.js";
// Now grab the window.gapi
const gapiStatic = window.gapi as (typeof gapi);

const info = debug('af/google#gapi:info');
info('Hello!');
// Library exports a static gapi variable that uses gapi.auth2 from @types/gapi

const gconfig = {
   apiKey: 'AIzaSyD57I9jyE6PB4QEZ5J7goi8oiEbN_N4Jgc', // this is only used for any unauthenticated requests, not really needed here
   clientId: '1090081130077-ffhfsld25cob0ci8p7d763lmfkh0ng1v.apps.googleusercontent.com',
   discoveryDocs: [ 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', 'https://sheets.googleapis.com/$discovery/rest?version=v4' ],
   scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
   immediate: true,
};

let _auth2: typeof gapi.auth2 | null = null;
export const auth2 = async () => {
  if (!_auth2) {
    _auth2 = await new Promise(async (resolve) => {
      gapiStatic.load('auth2', async () => {
        await gapiStatic.auth2.init(gconfig);
        resolve(gapiStatic.auth2);
      });
    });

  }
  return _auth2;
}

let _client: typeof gapi.client | null = null;
export const client = async () => {
  if (!_client) {
    _client = await new Promise(async (resolve) => {
      gapiStatic.load('client', async () => {
        await gapiStatic.client.init(gconfig);
        resolve(gapiStatic.client);
      });
    });
  }
  return _client;
};


