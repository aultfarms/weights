import type { FinalAccounts, Account, InventoryAccount, InventoryAccountTx, AccountTx } from '../ledger/types.js';
export * as livestock from './livestock.js';
export declare type MissingTxResult = {
    acct: InventoryAccount;
    missingInIvty: AccountTx[];
    missingInCash: InventoryAccountTx[];
};
export declare function findMissingTxByInOutCategories(accts: FinalAccounts): MissingTxResult[];
export declare function findMissingTxInAccount({ ivtyacct, cashaccts }: {
    ivtyacct: InventoryAccount;
    cashaccts: Account[];
}): MissingTxResult;
