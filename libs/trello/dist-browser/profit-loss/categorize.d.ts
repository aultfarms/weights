import type { AccountTx } from '../ledger/types.js';
import type { Moment } from 'moment';
import type { DateRange } from 'moment-range';
export declare type AmountConfig = {
    start?: Moment;
    end?: Moment;
    timerange?: DateRange;
    type?: 'debit' | 'credit';
    only?: string;
    exclude?: string;
};
export declare type CategoryTree = {
    name: string;
    parent?: CategoryTree | null;
    children: {
        [name: string]: CategoryTree;
    };
    transactions: AccountTx[];
};
export declare function amount(cat: CategoryTree, cfg?: AmountConfig): number;
export declare function debit(cat: CategoryTree, cfg?: AmountConfig): number;
export declare function credit(cat: CategoryTree, cfg?: AmountConfig): number;
export declare type CatIndex = {
    [cat: string]: true;
};
export declare function treeToCategoryNames(tree: CategoryTree, catindex: CatIndex, // mutates catindex
opts: {
    excludeRoot?: boolean;
}, parentstr?: string): void;
export declare function getCategory(cat: CategoryTree, name: string): CategoryTree | null;
export declare function containsCategory(cat: CategoryTree | null, name: string): boolean;
export declare function underCategory(cat: CategoryTree, search_parent_name: string): boolean;
export declare function categorize({ lines }: {
    lines: AccountTx[];
}): CategoryTree;
