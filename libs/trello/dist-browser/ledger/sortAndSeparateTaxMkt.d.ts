import type { Account, AccountTx, FinalAccounts, StatusFunction } from './types.js';
export declare function recomputeBalances(lines: AccountTx[]): AccountTx[];
export default function ({ accts, status }: {
    accts: Account[];
    status?: StatusFunction;
}): FinalAccounts;
