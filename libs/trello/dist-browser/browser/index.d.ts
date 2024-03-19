export * from '../types.js';
import type { TrelloRESTFunction, TrelloRequestFunction } from '../types.js';
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
    saveNewCardAtBottomOfList: ({ name, desc, idList }: {
        name: string;
        desc?: string | undefined;
        idList?: string | undefined;
    }) => Promise<void>;
    updateExistingCardNameAndMoveToBottomOfList: ({ name, cardid, idList }: {
        cardid: string;
        name: string;
        idList: string;
    }) => Promise<void>;
    waitUntilLoaded: () => Promise<void>;
    authorize: () => Promise<void>;
    deauthorize: () => Promise<void>;
    request: TrelloRequestFunction;
    get: TrelloRESTFunction;
    put: TrelloRESTFunction;
    post: TrelloRESTFunction;
    delete: TrelloRESTFunction;
};
