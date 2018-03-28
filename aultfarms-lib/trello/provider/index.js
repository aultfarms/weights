import { Provider, CerebralError } from 'cerebral';
import Promise from 'bluebird';

export class TrelloClientLoadError extends CerebralError {};

// dev key: 3ad06cb25802014a3f24f479e886771c
// URL to refresh client lib: https://api.trello.com/1/client.js?key=3ad06cb25802014a3f24f479e886771c

const waitUntilLoaded = () => Promise.try(() => {
  let count = 0;
  const check = () => {
    if (window.Trello) return true;
    if (count++ > 50) throw TrelloClientLoadError('Could not load Trello client library');
    return Promse.delay(250).then(check);
  };
  return Promise.try(check);
});

// Promisify the normal Trello client:
export default Provider({

  //-------------------------------------------------
  // call authorize first before any other functions in this provider:
  authorize: () => waitUntilLoaded().then(() => new Promise((resolve, reject) => {
    window.Trello.authorize({
      type: 'redirect',
      name: 'Ault Farms - Invoices',
      persist: true,
      scope: { read: 'true', write: 'true' },
      expiration: 'never',
      success: resolve,
      error: err => {
        console.log('Failed to authorize Trello: err = ', err);reject(err);
      }
    });
    return null;
  })),

  deauthorize: () => new Promise((resolve, reject) => {
    window.Trello.deauthorize();resolve();
  }),
  get: (path, params) => new Promise((resolve, reject) => window.Trello.get(path, params || {}, resolve, err => {
    console.log('Trello.get ERROR: ', err);reject(err);
  })),
  put: (path, params) => new Promise((resolve, reject) => window.Trello.put(path, params, resolve, err => {
    console.log('Trello.put ERROR: ', err);reject(err);
  })),
  post: (path, params) => new Promise((resolve, reject) => window.Trello.post(path, params, resolve, err => {
    console.log('Trello.post ERROR: ', err);reject(err);
  }))
});
//# sourceMappingURL=index.js.map