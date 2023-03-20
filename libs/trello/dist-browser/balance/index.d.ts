import { Moment } from 'moment';
import type { AccountTx, Account, FinalAccounts } from '../ledger/index.js';
export { moneyEquals } from '../ledger/util.js';
export { annualBalanceSheetToWorkbook } from './exporter.js';
export declare type BalanceTree = {
    name: string;
    balance: number;
    children: {
        [key: string]: BalanceTree;
    };
    acct?: Account;
};
export declare type BalanceSheet = {
    name: string;
    type: 'mkt' | 'tax';
    date: Moment;
    tree: BalanceTree;
};
export declare type AnnualBalanceSheet = {
    type: 'mkt' | 'tax';
    year: number;
    yearend?: BalanceSheet;
    asOfDate?: BalanceSheet;
    quarters?: BalanceSheet[];
};
export declare type CatIndex = {
    [cat: string]: true;
};
export declare function treeToCategoryNames(tree: BalanceTree, catindex: CatIndex, // mutates catindex
opts: {
    excludeRoot?: boolean;
}, parentstr?: string): void;
export declare function getAccountBalance({ balanceSheet, accountName, balanceTree }: {
    balanceSheet: BalanceSheet;
    accountName: string;
    balanceTree?: BalanceTree;
}): number;
export declare function balanceForAccountOnDate(d: Moment, acct: {
    lines: AccountTx[];
}): number;
export declare function annualBalanceSheet({ year, date, type, ledger }: {
    year: number;
    date?: Moment | string;
    type: 'mkt' | 'tax';
    ledger: FinalAccounts;
}): Promise<AnnualBalanceSheet>;
