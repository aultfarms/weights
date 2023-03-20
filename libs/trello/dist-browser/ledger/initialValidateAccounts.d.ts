import { RawSheetAccount, StatusFunction, ValidatedRawSheetAccount } from './types.js';
export default function ({ rawaccts, status }: {
    rawaccts: RawSheetAccount[];
    status: StatusFunction | null;
}): ValidatedRawSheetAccount[];
