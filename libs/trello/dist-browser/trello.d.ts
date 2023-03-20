import { PlatformSpecificTrelloLib, TrelloList } from './types.js';
export declare type Client = ReturnType<typeof getUniversalClient>;
export declare function getUniversalClient(client: PlatformSpecificTrelloLib): {
    connect: ({ org }: {
        org?: string | undefined;
    }) => Promise<void>;
    findBoardidByName: (name: string) => Promise<string>;
    findListsAndCardsOnBoard: ({ boardid, listnames }: {
        boardid: string;
        listnames?: string[] | undefined;
    }) => Promise<TrelloList[]>;
    waitUntilLoaded: () => Promise<void>;
    authorize: () => Promise<void>;
    deauthorize: () => Promise<void>;
    request: import("./types.js").TrelloRequestFunction;
    get: import("./types.js").TrelloRESTFunction;
    put: import("./types.js").TrelloRESTFunction;
    post: import("./types.js").TrelloRESTFunction;
};
