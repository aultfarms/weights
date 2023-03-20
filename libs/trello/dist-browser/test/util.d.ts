import type * as accounts from '../index.js';
export declare function noteMatches({ note, expect }: {
    note: any;
    expect: Record<string, string | number>;
}): boolean;
export declare function addLineToAccount({ partialline, accountname, ledger, lib }: {
    partialline: object;
    accountname: string;
    ledger: accounts.ledger.FinalAccounts;
    lib: typeof accounts;
}): Promise<accounts.ledger.FinalAccounts | null>;
