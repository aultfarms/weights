import momentrange from 'moment-range';
import { CategoryTree, treeToCategoryNames, getCategory, amount, AmountConfig, credit, debit } from './categorize.js';
import { moneyEquals } from '../ledger/util.js';
import type { FinalAccounts, AccountTx } from '../ledger/types.js';
export { profitLossToWorkbook } from './exporter.js';
export { CategoryTree, treeToCategoryNames, getCategory, amount, AmountConfig, credit, debit };
export { moneyEquals };
export declare type ProfitLossTimeRange = {
    year: number;
    name: string;
    yearend?: boolean;
    timerange: momentrange.DateRange;
    lines: AccountTx[];
    startlines: AccountTx[];
    categories: CategoryTree;
};
export declare type ProfitLoss = {
    year: number;
    type: 'tax' | 'mkt';
    lines: AccountTx[];
    timeranges: ProfitLossTimeRange[];
    categories: CategoryTree;
};
export declare function profitLoss({ ledger, type, year }: {
    ledger: FinalAccounts;
    type: 'mkt' | 'tax';
    year?: number;
}): ProfitLoss;
