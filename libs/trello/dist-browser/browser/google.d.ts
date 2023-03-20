import xlsx from 'xlsx-js-style';
import type { RawSheetAccount, StatusFunction } from '../ledger/types.js';
import { Ten99Settings } from '../ten99/index.js';
export declare function readAccountsFromGoogle({ status, accountsdir }: {
    status?: StatusFunction | null;
    accountsdir: string;
}): Promise<RawSheetAccount[]>;
export declare function read1099SettingsFromGoogle({ status, settingsdir }: {
    status?: StatusFunction | null;
    settingsdir: string;
}): Promise<Ten99Settings>;
export declare function uploadXlsxWorkbookToGoogle({ parentpath, parentid, filename, workbook }: {
    parentpath?: string;
    parentid?: string;
    filename: string;
    workbook: xlsx.WorkBook;
}): Promise<{
    id: string;
}>;
