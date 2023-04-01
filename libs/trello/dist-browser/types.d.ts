export declare type TrelloAuthorizeParams = {
    type: 'redirect';
    name: string;
    persist: true;
    scope: {
        read?: 'true' | 'false';
        write?: 'true' | 'false';
    };
    expiration: string | 'never';
    success: () => void;
    error: (err: any) => void;
};
export declare type TrelloRequestParams = {
    fields?: string;
    name?: string;
    idList?: string;
};
export declare type TrelloLabel = {
    color: string;
};
export declare type TrelloCard = {
    id: string;
    idList: string;
    name: string;
    closed: boolean;
    dateLastActivity: string;
    desc: string;
    idBoard: string;
    labels: string[];
    pos: number;
};
export declare function assertTrelloCard(o: any): asserts o is TrelloCard;
export declare function assertTrelloCards(o: any): asserts o is TrelloCard[];
export declare type TrelloList = {
    id: string;
    idBoard: string;
    pos?: number;
    name: string;
    cards?: TrelloCard[];
};
export declare function assertTrelloList(o: any): asserts o is TrelloList;
export declare function assertTrelloLists(o: any): asserts o is TrelloList[];
export declare type TrelloBoard = {
    id: string;
    name: string;
};
export declare function assertTrelloBoard(o: any): asserts o is TrelloBoard;
export declare function assertTrelloBoards(o: any): asserts o is TrelloBoard[];
export declare type TrelloOrg = {
    id: string;
    name: string;
    displayName: string;
};
export declare function assertTrelloOrg(o: any): asserts o is TrelloOrg;
export declare function assertTrelloOrgs(o: any): asserts o is TrelloOrg[];
export declare type TrelloRequestResponse = TrelloCard[] | TrelloList[] | TrelloBoard[];
export declare type TrelloSuccessCallback = (response: TrelloRequestResponse) => any;
export declare type TrelloRejectCallback = (err: any) => void;
export declare type TrelloRESTFunction = (path: string, params: TrelloRequestParams) => Promise<TrelloRequestResponse>;
export declare type TrelloRequestFunction = (method: 'get' | 'put' | 'post' | 'delete', path: string, params: TrelloRequestParams) => Promise<TrelloRequestResponse>;
export declare type PlatformSpecificTrelloLib = {
    waitUntilLoaded: () => Promise<void>;
    authorize: () => Promise<void>;
    deauthorize: () => Promise<void>;
    request: TrelloRequestFunction;
    get: TrelloRESTFunction;
    put: TrelloRESTFunction;
    post: TrelloRESTFunction;
    delete: TrelloRESTFunction;
};
