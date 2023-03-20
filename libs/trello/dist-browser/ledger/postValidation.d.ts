import { Moment } from 'moment';
import type { AccountTx } from './types.js';
import type { JSONSchema8 } from 'jsonschema8';
export { JSONSchema8 };
export declare const categorySchemas: {
    [cat: string]: JSONSchema8;
};
export declare function validateNoteSchemaForCatgory({ account, catname, startDate, schema, exactCatnameMatch }: {
    account: {
        lines: AccountTx[];
    };
    catname: string;
    schema: JSONSchema8;
    startDate: string | Moment;
    exactCatnameMatch?: true;
}): {
    line: AccountTx;
    error: string;
}[] | null;
export declare function validateNotesAllSchemas({ account, schemas, startDate }: {
    account: {
        lines: AccountTx[];
    };
    startDate: string | Moment;
    schemas?: {
        [catname: string]: JSONSchema8;
    };
}): {
    [catname: string]: {
        line: AccountTx;
        error: string;
    }[] | null;
};
export declare function validateNoOneLevelCategories({ account, startDate, exclude }: {
    account: {
        lines: AccountTx[];
    };
    startDate: string | Moment;
    exclude?: string[];
}): {
    line: AccountTx;
    error: string;
}[] | null;
