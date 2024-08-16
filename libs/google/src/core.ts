/// <reference types="gapi" />
/// <reference types="gapi.client" />
import debug from 'debug';
// Sadly, gapi-script library did not work for me, I had to grab the thing from google myself
// and then follow how gapi-script did it to get it loading statically w/ types
// load window.gapi
// import "./gapi.js";
// Now grab the window.gapi
//let gapiStatic: typeof gapi | null = null;

const trace = debug('af/google#drive/core:trace');
const info = debug('af/google#drive/core:info');
const warn = debug('af/google#drive/core:warn');

// Library exports a static gapi variable that uses gapi.auth2 from @types/gapi

export const gconfig = {
   apiKey: 'AIzaSyD57I9jyE6PB4QEZ5J7goi8oiEbN_N4Jgc', // this is only used for any unauthenticated requests, not really needed here
   clientId: '1090081130077-ffhfsld25cob0ci8p7d763lmfkh0ng1v.apps.googleusercontent.com',
   discoveryDocs: [ 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', 'https://sheets.googleapis.com/$discovery/rest?version=v4' ],
   scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
   immediate: true,
};

async function loadGAPIScript() {
  return new Promise<void>((resolve, reject) => {
    if (document.getElementById('google-gapi-script')) {
        resolve();
    } else {
      const script = document.createElement('script');
      script.id = 'google-gapi-script';
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.onload = () => {
        info('gapi script is loaded');
        resolve();
      };
      script.onerror = (e: any) => reject(new Error('Failed to load Google API (GAPI) script: error was: '+e));
      document.head.appendChild(script);
    }
  });
}
async function loadGISScript() {
  return new Promise<void>((resolve, reject) => {
    if (document.getElementById('google-identity-services-script')) {
        resolve();
    } else {
      const script = document.createElement('script');
      script.id = 'google-identity-services-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        info('google-identity-services script is loaded');
        resolve();
      }
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.head.appendChild(script);
    }
  });
}

let _client: typeof gapi.client | null = null;
let _gisOAuth2: typeof google.accounts.oauth2 | null = null;
async function load() {
  if (_client) return;
  // There are two libraries to load:
  // - gapi (which lets you load sheets and drive), and
  // - google identity services which gets you an accessToken for gapi

  // To initialize GAPI, first load the script into the browser
  await loadGAPIScript();
  // Then, tell it to load the client:
  await new Promise<void>((resolve, reject) => {
    info('Loading gapi client library');
    gapi.load('client', { callback: resolve, onerror: reject });
  });
  info('Gapi client loaded, now calling client.init')
  // Then, load all the services via their hosted discovery docs: (drive and sheets):
  await gapi.client.init({ apiKey: gconfig.apiKey });
  for (const service of gconfig.discoveryDocs) {
    info('Loading gapi client servive discovery document: '+service)
    await gapi.client.load(service);
  }
  // You'll need to call authorize() to make sure we have a token and are logged in.
  _client = gapi.client;

  // Once this is loaded, then use authorize() in auth.ts to login (sets the token in gapi.client)
  await loadGISScript();
  _gisOAuth2 = google.accounts.oauth2;
}

export async function client() {
  if (!_client) await load();
  if (!_client) throw new Error('GAPI client was null even after loading');
  return _client;
};

export async function gisOAuth2() {
  if (!_gisOAuth2) await load();
  if (!_gisOAuth2) throw new Error('ERROR: gisOAuth2 was null even after loading');
  return _gisOAuth2;
};