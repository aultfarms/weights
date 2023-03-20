import type { Account, FinalAccounts, StatusFunction } from './types.js';
export default function ({ accts, status }: {
    accts: Account[];
    status?: StatusFunction;
}): FinalAccounts;
