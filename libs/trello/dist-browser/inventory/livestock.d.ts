import { LivestockInventoryAccount } from '../ledger/types.js';
import { Moment } from 'moment';
declare type LivestockInventoryKeyTxParameters = {
    index: number;
    taxAmount: number;
    taxBalance: number;
    weight: number;
    weightBalance: number;
    amount: number;
    balance: number;
    qty: number;
    qtyBalance: number;
};
declare type DeadRecord = {
    date: Moment;
    qty: number;
};
declare type DeadStarterTx = {
    date: Moment;
    description: 'DEAD';
    category: 'cattle-dead';
    qty: number;
    amount: 0;
};
declare type DailyGainStarterTx = {
    date: Moment;
    description: 'DAILYGAIN';
    category: 'inventory-cattle-dailygain';
    qty: 0;
    taxAmount: 0;
};
export declare function computeMissingDailyGains({ acct, today }: {
    acct: LivestockInventoryAccount;
    today?: Moment;
}): DailyGainStarterTx[];
export declare function computeMissingDeadTx({ acct, deads }: {
    acct: LivestockInventoryAccount;
    deads: DeadRecord[];
}): DeadStarterTx[];
export declare function computeLivestockFifoChangesNeeded(acct: LivestockInventoryAccount): LivestockInventoryKeyTxParameters[];
export {};
