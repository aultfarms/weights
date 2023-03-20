import type { TrelloRESTFunction, TrelloRequestFunction } from '../types.js';
declare const _default: {
    findBoardidByName: (name: string) => Promise<string>;
    waitUntilLoaded: () => Promise<void>;
    authorize: () => Promise<void>;
    deauthorize: () => Promise<void>;
    request: TrelloRequestFunction;
    get: TrelloRESTFunction;
    put: TrelloRESTFunction;
    post: TrelloRESTFunction;
};
export default _default;
