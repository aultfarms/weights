import Trello from 'trello';
import { readFile } from 'fs/promises';
import json5 from 'json5';
import debug from 'debug';
import universalTrello from '../index.js';
const info = debug('af/trello#node:info');
let client = null;
async function waitUntilLoaded() {
    if (client)
        return;
    const token = json5.parse((await readFile('/Users/aultac/.trello/token.js'))
        .toString()
        .replace(/module\.exports += +/, '')
        .replace(';', ''));
    if (typeof token.devKey !== 'string') {
        throw new Error('Trello Fail: token file does not have devKey');
    }
    if (typeof token.token !== 'string') {
        throw new Error('Trello Fail: token file does not have token');
    }
    client = new Trello(token.devKey, token.token);
}
;
//-----------------------------------------------------------------
// Trello client keeps the token locally in order to make requests
async function authorize() {
    await waitUntilLoaded();
}
async function deauthorize() {
    await waitUntilLoaded();
    client = null;
}
;
const request = async (method, path, params) => {
    await waitUntilLoaded();
    try {
        const url = '/1' + path; // API has /1 on the front
        return client.makeRequest(method, url, params);
    }
    catch (e) {
        if (e && e.response)
            delete e.respone;
        throw e;
    }
};
const get = async (path, params) => request('get', path, params);
const put = async (path, params) => request('put', path, params);
const post = async (path, params) => request('post', path, params);
export default universalTrello({
    waitUntilLoaded,
    authorize,
    deauthorize,
    request,
    get,
    put,
    post
});
//# sourceMappingURL=index.js.map