export * from '../types.js';
import debug from 'debug';
import type { TrelloAuthorizeParams, TrelloRESTFunction, TrelloRequestParams, TrelloRequestFunction, TrelloSuccessCallback, TrelloRejectCallback } from '../types.js';
import { getUniversalClient } from '../client.js';
import $ from 'jquery' // for trello
const info = debug('af/trello#browser:info');

export * from '../index.js';

(window as any).jQuery = $; // put this on there for Trello to use

// dev key: 3ad06cb25802014a3f24f479e886771c
// URL to refresh client lib: https://api.trello.com/1/client.js?key=3ad06cb25802014a3f24f479e886771c
type BrowserTrelloRESTFunction = (path: string, params: TrelloRequestParams, success: TrelloSuccessCallback, err: TrelloRejectCallback) => void;


type WindowTrello = typeof window & {
  Trello: {
    authorize: (params: TrelloAuthorizeParams) => Promise<void>,
    deauthorize: () => Promise<void>,
    get: BrowserTrelloRESTFunction,
    put: BrowserTrelloRESTFunction,
    post: BrowserTrelloRESTFunction,
    delete: BrowserTrelloRESTFunction,
  }
}


async function waitUntilLoaded(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Get the trello browser client
    import('./trello-client.js').then(() => {
      let count = 0;
      const check = () => {
        if ('Trello' in window) return resolve();
        if (count++ > 50) return reject(new Error('Could not load Trello client library'));
        setTimeout(check, 250);
      }
      check();
    });
  });
};


//-----------------------------------------------------------------
// Trello client keeps the token locally in order to make requests
async function authorize(): Promise<void> {
  await waitUntilLoaded();
  const win = (window as WindowTrello);
  return new Promise<void>((resolve,reject) => {
    win.Trello.authorize({
      type: 'redirect',
      name: 'Ault Farms - Invoices',
      persist: true,
      scope: { read: 'true', write: 'true' },
      expiration: 'never',
      success: resolve,
      error: (err) => { info('Failed to authorize Trello: err =', err); reject(err); }
    });
  });
}

async function deauthorize(): Promise<void> {
  await waitUntilLoaded();
  const win = (window as WindowTrello);
  return new Promise((resolve) => { 
    win.Trello.deauthorize(); 
    resolve(); 
  });
};



const request: TrelloRequestFunction = async (method, path, params) => {
  await waitUntilLoaded();
  const win = (window as WindowTrello);
  return new Promise((resolve,reject) => 
    win.Trello[method]( 
      path, 
      params||{}, 
      resolve, 
      err => { info(`Trello.${method} ERROR: `, err); reject(err); } 
    )
  );
};

const get: TrelloRESTFunction = async (path,params) => request('get', path, params);
const put: TrelloRESTFunction = async (path,params) => request('put', path, params);
const post: TrelloRESTFunction = async (path,params) => request('post', path, params);
const del: TrelloRESTFunction = async (path,params) => request('delete', path, params);

const _client = getUniversalClient({
  waitUntilLoaded,
  authorize,
  deauthorize,
  request,
  get,
  put,
  post,
  delete: del,
});
export function getClient() { return _client; }
