export * from '../types.js';
import type { TrelloRESTFunction } from '../types.js';
export * from '../index.js';
export declare function getClient(): {
    connect: ({ org }: {
        org?: string | undefined;
    }) => Promise<void>;
    findBoardidByName: (name: string) => Promise<string>;
    findListsAndCardsOnBoard: ({ boardid, listnames }: {
        boardid: string;
        listnames?: string[] | undefined;
    }) => Promise<import("../types.js").TrelloList[]>;
    waitUntilLoaded: () => Promise<void>;
    authorize: () => Promise<void>;
    deauthorize: () => Promise<void>;
    request: import("../types.js").TrelloRequestFunction;
    get: TrelloRESTFunction;
    put: TrelloRESTFunction;
    post: TrelloRESTFunction;
};
