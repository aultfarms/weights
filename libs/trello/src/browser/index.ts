export * from '../types.js';
import debug from 'debug';
import { type TrelloRESTFunction, type TrelloRequestFunction,
  assertTrelloBoards, assertTrelloBoard, assertTrelloOrgs, assertTrelloOrg,
  assertTrelloLists, assertTrelloList, assertTrelloCards, assertTrelloCard } from '../types.js';
import { getUniversalClient } from '../client.js';
const info = debug('af/trello#browser:info');

export * from '../index.js'; // export all the universal things

// dev key: 3ad06cb25802014a3f24f479e886771c
// URL to refresh client lib: https://api.trello.com/1/client.js?key=3ad06cb25802014a3f24f479e886771c
const devKey = '3ad06cb25802014a3f24f479e886771c';
//type BrowserTrelloRESTFunction = (path: string, params: TrelloRequestParams, success: TrelloSuccessCallback, err: TrelloRejectCallback) => void;

async function waitUntilLoaded(): Promise<void> { return; } // This library is always loaded

//-----------------------------------------------------------------
let token = '';
async function authorize(): Promise<void> {
  info('Authorize started.')

  await waitUntilLoaded();
  // Check localStorage for existing token
  token = localStorage.getItem('trello_token') || '';
  if (token) return;

  // Check if we're getting here as a result of a previous redirect
  // that is now coming back to us with a token
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  token = hashParams.get('token') || '';
  if (token) {
    const error = hashParams.get('error') || '';
    if (error) throw new Error('ERROR: User declined access or other Trello failure.  Error was: '+error);
    if (token) {
      localStorage.setItem('trello_token', token);
      return;
    }
    info('WARNING: window.location.hash (', window.location.hash, ') has token, but it was not valid, retrying redirect.')
  }

  const return_url = window.location.href.replace(/#.*$/, '');
  // Redirect browser to Trello authorization endpoint
  const newhref = 'https://api.trello.com/1/authorize'
    + '?return_url='+return_url
    + '&callback_method=fragment'
    + '&scope=read,write'
    + '&expiration=never'
    + '&name=Ault%20Farms%20Apps'
    + '&key='+devKey
    + '&response_type=fragment';
  window.location.href = newhref; // adds to browser history
  window.location.replace(newhref); // actually immediately redirects and stops execution
}

async function deauthorize(): Promise<void> {
  localStorage.removeItem('trello_token');
  await waitUntilLoaded();
};

const request: TrelloRequestFunction = async (method, path, params) => {
  await waitUntilLoaded();
  const stringParams: Record<string,string> = {};
  for (const [key,val] of Object.entries(params)) {
    stringParams[key] = ''+val;
  }
  stringParams['key'] = devKey;
  stringParams['token'] = token;
  const searchParams = new URLSearchParams(stringParams);
  const joiner = path.indexOf('?') >= 0 ? '&' : '?';
  path += joiner + searchParams.toString();
  if (path[0]!== '/') path = '/' + path;
  const result = await fetch('https://api.trello.com/1'+path, {
    method,
  });
  // Check if we have a card, list, board, or org:
  const body = await result.json();
  try { assertTrelloOrgs(body);   return  body;  } catch(e: any) {};
  try { assertTrelloOrg(body);    return [body]; } catch(e: any) {};
  try { assertTrelloBoards(body); return  body;  } catch(e: any) {};
  try { assertTrelloBoard(body);  return [body]; } catch(e: any) {};
  try { assertTrelloLists(body);  return  body;  } catch(e: any) {};
  try { assertTrelloList(body);   return [body]; } catch(e: any) {};
  try { assertTrelloCards(body);  return  body;  } catch(e: any) {};
  try { assertTrelloCard(body);   return [body]; } catch(e: any) {};
  info('ERROR: did not return Org[], Board[], List[], or Card[],  Result was: ', body);
  throw new Error('ERROR: request did not return a valid Trello Org[], Board[], List[], or Card[]')
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
  delete: del, // delete is a reserved word
});
export function getClient() { return _client; }