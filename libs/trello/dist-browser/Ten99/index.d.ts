import { moneyEquals } from '../ledger/util.js';
import type { FinalAccounts, AccountTx } from '../ledger/types.js';
import { Ten99Settings, Ten99SettingsCategory, Ten99SettingsPerson, importSettings } from './settings.js';
export { ten99ToWorkbook } from './exporter.js';
export { Ten99Settings, Ten99SettingsPerson, Ten99SettingsCategory, importSettings };
export { moneyEquals };
export declare type Ten99SummaryCategory = {
    name: string;
    amount: number;
    lines: AccountTx[];
};
export declare type Ten99Entry = {
    person: Ten99SettingsPerson;
    lines: AccountTx[];
    categories: Ten99SummaryCategory[];
    total: number;
};
export declare type Annual1099 = Ten99Entry[];
export declare type Ten99Result = {
    ten99: Annual1099;
    missing_people_from_required_categories: {
        [category: string]: string[];
    };
};
export declare function ten99({ ledger, year, settings }: {
    ledger: FinalAccounts;
    year: number;
    settings: Ten99Settings;
}): Ten99Result;
