import type { ValidatedRawTx, ValidatedRawSheetAccount } from "./types.js";
export declare function weHave(v: any): boolean;
export declare function isStart(tx: any): boolean;
export declare function mapSkipErrors(lines: ValidatedRawTx[], mapper: (l: ValidatedRawTx, i?: number) => ValidatedRawTx): ValidatedRawTx[];
export declare function moneyEquals(a: number, b: number): boolean;
export declare function integerEquals(a: number, b: number): boolean;
export declare function line2Str(l: any): string;
export declare function ledger2Str(acct: ValidatedRawSheetAccount): string;
