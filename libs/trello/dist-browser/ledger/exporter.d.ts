import xlsx from 'xlsx-js-style';
import type { AccountTx, ValidatedRawTx, AccountSettings } from './types.js';
export declare function accountToWorkbook(acct: {
    name?: string;
    settings?: AccountSettings;
    lines: AccountTx[] | ValidatedRawTx[];
}): xlsx.WorkBook;
