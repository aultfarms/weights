import { ValidatedRawSheetAccount, Account, StatusFunction } from './types.js';
export default function ({ accts, status }: {
    accts: ValidatedRawSheetAccount[];
    status?: StatusFunction;
}): Account[];
