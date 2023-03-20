import type { ValidatedRawSheetAccount, StatusFunction } from './types.js';
export default function ({ accts, status }: {
    accts: ValidatedRawSheetAccount[];
    status: StatusFunction;
}): ValidatedRawSheetAccount[];
