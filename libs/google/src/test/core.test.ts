import type * as google from '../';
import debug from 'debug';
import type { CheckableToken } from '../auth';

const info = debug('test/google:info');

type Google = typeof google;

export default async function run(g: Google) {
  await itLoads(g);
  await core(g);
  await auth(g);
}

export async function itLoads(g: Google) {
  info('itLoads: starting');
  if (!g) throw 'Google is not ok';
  info('itLoads: passed');
};

export async function core(g: Google) {
  info('core: starting');
  info('core: gisOAuth2');
  const auth2 = await g.core.gisOAuth2();
  if (!auth2) throw 'gisOAuth2 did not load';
  info('core: client');
  const c = await g.core.client();
  if (!c) throw 'client did not load';
  if (!c.drive) throw 'client did not load drive api';
  if (!c.sheets) throw 'client did not load sheets api';
  info('core: passed');
};

export async function auth(g: Google) {
  info('auth: deauthorize');
  await g.auth.deauthorize();
  if (localStorage.getItem('google-token')) throw 'Token was not cleared';

  info('auth: authorize (after deauthorize, so token is forced)');
  await g.auth.authorize();
  const isauthed = (await g.core.client()).getToken();
  if (!isauthed) throw 'Auth did not return truthy';

  info('auth: re-auth when token should not be expired (no popup).  If you see a popup, consider this failed.')
  let authresult = await g.auth.authorize();
  if (authresult!== 'token_already_valid') throw 'Auth did not return token_already_valid, token should have still been valid';

  info('Testing expiring the token with issued_at_ms, should also test waiting for buffer time between requests')
  let token: CheckableToken | null = null;
  try {
    token = JSON.parse(localStorage.getItem('google-token') || '');
    g.auth.assertCheckableToken(token);
  } catch(e) {
    info('FAIL: Token was not valid in localStorage. Parsed token was: ', token, ', and raw localStorage was: ', localStorage.getItem('google-token'), ', error was: ', e);
    throw 'Token was not valid in localStorage.';
  }
  token.issued_at_ms = Date.now() - token.expires_in_ms + 10; // 5-min buffer should require token refreh 10ms before expiration
  localStorage.setItem('google-token', JSON.stringify(token));
  authresult = await g.auth.authorize({ forceReloadFromLocalStorage: true });
  if (authresult !== 'requested_new_token') throw 'Token should have been expired, but did not request a new one';
  // Now grab the token back from local storage and it should be a new token
  let new_token: CheckableToken | null = null;
  try {
    new_token = JSON.parse(localStorage.getItem('google-token') || '');
    g.auth.assertCheckableToken(new_token);
  } catch(e) {
    info('FAIL: New token was not valid in localStorage. Parsed new_token was: ', new_token, ', and raw localStorage was: ', localStorage.getItem('google-token'), ', error was: ', e);
    throw 'New token was not valid in localStorage.';
  }
  if (new_token.access_token === token.access_token) throw 'After authorize, token in localstorage was still same as the old one.';

  info('authorize finished, authresult = ', authresult)

  info('auth: passed');
}