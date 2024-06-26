import type * as google from '../';
import debug from 'debug';

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
  if (!window.gapi) throw 'GAPI is not ok';
  info('itLoads: passed');
};

export async function core(g: Google) {
  info('core: starting');
  info('core: auth2');
  const auth2 = await g.core.auth2();
  if (!auth2) throw 'auth2 did not load';
  info('core: client');
  const c = await g.core.client();
  if (!c) throw 'client did not load';
  if (!c.drive) throw 'client did not load drive api';
  if (!c.sheets) throw 'client did not load sheets api';
  info('core: passed');
};

export async function auth(g: Google) {
  info('auth: starting');
  const isauthed = await g.auth.authorize();
  if (!isauthed) throw 'Auth did not return truthy';
  info('auth: passed');
}