/// <reference types="gapi" />
/// <reference types="gapi.client" />
/// <reference types="gapi.auth2" />
import debug from 'debug';
// Sadly, gapi-script library did not work for me, I had to grab the thing from google myself 
// and then follow how gapi-script did it to get it loading statically w/ types
// load window.gapi
import "./gapi.js";
// Now grab the window.gapi
const gapiStatic = window.gapi as (typeof gapi);

const trace = debug('af/google#drive/core:trace');

// Library exports a static gapi variable that uses gapi.auth2 from @types/gapi

const gconfig = {
   apiKey: 'AIzaSyD57I9jyE6PB4QEZ5J7goi8oiEbN_N4Jgc', // this is only used for any unauthenticated requests, not really needed here
   clientId: '1090081130077-ffhfsld25cob0ci8p7d763lmfkh0ng1v.apps.googleusercontent.com',
   discoveryDocs: [ 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', 'https://sheets.googleapis.com/$discovery/rest?version=v4' ],
   scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
   immediate: true,
};

let _auth2: typeof gapi.auth2 | null = null;
let _client: typeof gapi.client | null = null;
async function load() {
  await new Promise<void>(async (resolve) => {
    trace('Loading client from static gapi library');
    gapiStatic.load('client:auth2', async (result: any) => {
      trace('client loaded, initializing, result of load = ', result);
      const result2 = await gapiStatic.client.init(gconfig);
      _auth2 = gapiStatic.auth2;
      _client = gapiStatic.client;
      trace('gapi loaded, result of init = ', result2, ', and token = ', _auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token);
      resolve();
    });
  });
}

export const auth2 = async () => {
  if (!_auth2) await load();
  if (!_auth2) throw new Error(`auth2 was null even after loading`);
  return _auth2;
}

export const client = async () => {
  if (!_client) await load();
  if (!_client) throw new Error(`client was null even after loading`);
  return _client;
};


