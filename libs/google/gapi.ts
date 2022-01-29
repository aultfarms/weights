import { gapi as gapiStatic, loadGapiInsideDOM, loadAuth2WithProps } from 'gapi-script';

// Library exports a static gapi variable that uses gapi.auth2 from @types/gapi
type Gapi = typeof gapiStatic;

let _gapi: Gapi | null = null;
export const gapi = async (): Promise<Gapi> => {
  if (!_gapi) {
    _gapi = await loadGapiInsideDOM();
  }
  return _gapi;
}
const gconfig = {
   apiKey: 'AIzaSyD57I9jyE6PB4QEZ5J7goi8oiEbN_N4Jgc', // this is only used for any unauthenticated requests, not really needed here
   clientId: '1090081130077-ffhfsld25cob0ci8p7d763lmfkh0ng1v.apps.googleusercontent.com',
   discoveryDocs: [ 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', 'https://sheets.googleapis.com/$discovery/rest?version=v4' ],
   scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets',
   immediate: true,
};

let _auth2: Gapi["auth"] | null = null;
export const auth2 = async (): Promise<Gapi["auth"]> => {
  if (!_auth2) {
    _auth2 = await loadAuth2WithProps(await gapi(), gconfig);
  }
  return (_auth2 as Gapi["auth"]);
}

let _client: Gapi["client"] | null = null;
export const client = async () => {
  if (!_client) {
    const g = await gapi();
    _client = await new Promise(async (resolve) => {
      g.load('client', async () => {
        await g.client.init(gconfig);
        resolve(g.client);
      });
    });
  }
  return (_client as Gapi["client"]);
};


