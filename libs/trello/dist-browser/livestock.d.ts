import type { TrelloCard } from './types.js';
import type { client } from './index.js';
export type ErrorRecord = {
    cardName?: string;
    idList?: string;
    id?: string;
    error: string;
};
export type Tag = {
    number: number;
    color: string;
    groupname?: string;
};
export type TagRange = {
    start: Tag;
    end: Tag;
};
export type DeadRecord = {
    date: string;
    tags: Tag[];
    note?: string | false;
    id: string;
    idList: string;
    cardName: string;
    dateLastActivity: string;
};
export type IncomingRecord = {
    date: string;
    groupname: string;
    into?: string;
    weight?: number;
    head?: number;
    tags?: TagRange[];
    dead?: DeadRecord[];
    id: string;
    idList: string;
    cardName: string;
    dateLastActivity: string;
};
export type TreatmentRecord = {
    date: string;
    treatment: string;
    tags: Tag[];
    id: string;
    idList: string;
    cardName: string;
    dateLastActivity: string;
};
export type LivestockRecords = {
    dead: {
        records: DeadRecord[];
        errors: ErrorRecord[];
    };
    incoming: {
        records: IncomingRecord[];
        errors: ErrorRecord[];
    };
    treatments: {
        records: TreatmentRecord[];
        errors: ErrorRecord[];
    };
};
export declare function rangeContainsTag(r: TagRange, tag: Tag): boolean;
export declare function groupContainsTag(group: IncomingRecord, tag: Tag): boolean;
export declare function groupForTag(records: LivestockRecords, tag: Tag, asOfDateString?: string | false): IncomingRecord | false;
export declare function tagStrToObj(str: string): Tag;
export declare function tagObjToStr(t: Tag): string;
export declare function fetchRecords(client: client.Client): Promise<LivestockRecords>;
export declare function deadCardToRecord(c: TrelloCard): DeadRecord | ErrorRecord;
export declare function incomingCardToRecord(c: TrelloCard): IncomingRecord | ErrorRecord;
export declare function treatmentCardToRecord(c: TrelloCard): TreatmentRecord | ErrorRecord;
