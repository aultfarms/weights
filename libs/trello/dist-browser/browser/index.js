export * from '../types.js';
import debug from 'debug';
import { getUniversalClient } from '../client.js';
import $ from 'jquery'; // for trello
const info = debug('af/trello#browser:info');
export * from '../index.js';
window.jQuery = $; // put this on there for Trello to use
async function waitUntilLoaded() {
    return new Promise((resolve, reject) => {
        // Get the trello browser client
        import('./trello-client.js').then(() => {
            let count = 0;
            const check = () => {
                if ('Trello' in window)
                    return resolve();
                if (count++ > 50)
                    return reject(new Error('Could not load Trello client library'));
                setTimeout(check, 250);
            };
            check();
        });
    });
}
;
//-----------------------------------------------------------------
// Trello client keeps the token locally in order to make requests
async function authorize() {
    await waitUntilLoaded();
    const win = window;
    return new Promise((resolve, reject) => {
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
async function deauthorize() {
    await waitUntilLoaded();
    const win = window;
    return new Promise((resolve) => {
        win.Trello.deauthorize();
        resolve();
    });
}
;
const request = async (method, path, params) => {
    await waitUntilLoaded();
    const win = window;
    return new Promise((resolve, reject) => win.Trello[method](path, params || {}, resolve, err => { info(`Trello.${method} ERROR: `, err); reject(err); }));
};
const get = async (path, params) => request('get', path, params);
const put = async (path, params) => request('put', path, params);
const post = async (path, params) => request('post', path, params);
const del = async (path, params) => request('delete', path, params);
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
//# sourceMappingURL=index.js.map