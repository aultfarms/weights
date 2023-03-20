import { Moment } from 'moment';
export declare type StatusFunction = (msg: string) => any;
export declare type RawSheetAccount = {
    filename: string;
    name: string;
    lines: any[];
    [key: string]: any;
};
export declare type ValidatedRawTx = {
    lineno: number;
    acct: {
        name: string;
        filename: string;
        [key: string]: any;
    } | AccountInfo;
    date?: Moment | string | null;
    description?: string | 'SPLIT';
    amount?: number;
    splitamount?: number;
    balance?: number;
    category?: string;
    note?: string | boolean | number | any[] | {
        [key: string]: any;
    };
    writtenDate?: Moment | string | null;
    postDate?: Moment | string | null;
    transferacct?: string;
    isStart?: boolean;
    stmtacct?: string;
    stmtlineno?: number;
    errors?: string[];
    qty?: number;
    qtyBalance?: number;
    aveValuePerQty?: number;
    taxAmount?: number;
    taxBalance?: number;
    weight?: number;
    weightBalance?: number;
    aveValuePerWeight?: number;
    [key: string]: any;
};
export declare function assertValidatedRawTx(t: any): asserts t is ValidatedRawTx;
export declare type ValidatedRawSheetAccount = {
    name: string;
    filename: string;
    lines: ValidatedRawTx[];
    settings: AccountSettings;
    origin?: OriginAccount;
    errors?: string[];
};
export declare type AccountSettings = BaseAccountSettings | AssetAccountSettings | InventoryAccountSettings;
export declare type BaseAccountSettings = {
    accounttype: 'inventory' | 'asset' | 'futures-asset' | 'futures-cash' | 'cash' | 'invalid';
    acctname?: string;
    balancetype?: 'inverted';
    amounttype?: 'inverted';
    mktonly?: boolean;
    taxonly?: boolean;
    [key: string]: any;
};
export declare type AssetAccountSettings = BaseAccountSettings & {
    accounttype: 'asset';
    asOfDate?: string;
    priorDate?: string;
    idcolumn?: string;
};
export declare type InventoryAccountSettings = BaseInventoryAccountSettings | LivestockInventoryAccountSettings;
export declare type BaseInventoryAccountSettings = BaseAccountSettings & {
    accounttype: 'inventory';
    inventorytype?: 'livestock';
    startYear: number;
    inCategories?: string[];
    outCategories: string[];
    qtyKey: string;
};
export declare type PriceWeightPoint = {
    weight: number;
    price: number;
};
export declare type LivestockInventoryAccountSettings = BaseInventoryAccountSettings & {
    inventorytype: 'livestock';
    rog: number;
};
export declare function assertAccountSettings(o: any): asserts o is AssetAccountSettings;
export declare function assertBaseAccountSettings(o: any): asserts o is BaseAccountSettings;
export declare function assertAssetAccountSettings(o: any): asserts o is AssetAccountSettings;
export declare function assertInventoryAccountSettings(o: any): asserts o is InventoryAccountSettings;
export declare function isLivestockInvetoryAccountSettings(o: any): o is LivestockInventoryAccountSettings;
export declare function assertLivestockInventoryAccountSettings(o: any): asserts o is LivestockInventoryAccountSettings;
export declare type InventoryNote = {
    [qtyKey: string]: number;
};
export declare function assertInventoryNote(qtyKey: string, o: any): asserts o is InventoryNote;
export declare function assertPriceWeightPoint(o: any): asserts o is PriceWeightPoint;
export declare function assertPriceWeightPoints(o: any): asserts o is PriceWeightPoint[];
export declare type LivestockInventoryNote = InventoryNote & {
    head: number;
    weight: number;
};
export declare function assertLivestockInventoryNote(o: any): asserts o is LivestockInventoryNote;
export declare type AccountInfo = {
    name: string;
    filename: string;
    settings: AccountSettings;
    origin?: Omit<OriginAccount, 'lines'>;
};
export declare function assertAccountInfo(a: any): asserts a is AccountInfo;
export declare type AccountTx = {
    date: Moment;
    description: string | 'SPLIT';
    amount: number;
    splitamount?: number;
    balance: number;
    category: string;
    note?: string | number | boolean | any[] | {
        [key: string]: any;
    };
    writtenDate?: Moment;
    postDate?: Moment;
    is_error?: false;
    isStart?: boolean;
    acct: AccountInfo;
    stmtacct?: string;
    lineno: number;
    stmtlineno?: number;
    [key: string]: any;
};
export declare function assertAccountTx(l: any): asserts l is AccountTx;
export declare type InventoryAccountTx = AccountTx & {
    qty: number;
    qtyBalance: number;
    aveValuePerQty: number;
    taxAmount?: number;
    taxBalance?: number;
};
export declare type LivestockInventoryAccountTx = InventoryAccountTx & {
    weight: number;
    weightBalance: number;
    aveValuePerWeight: number;
    taxAmount: number;
    taxBalance: number;
};
export declare function assertInventoryAccountTx(o: any): asserts o is InventoryAccountTx;
export declare function assertLivestockInventoryAccountTx(o: any): asserts o is InventoryAccountTx;
export declare type OriginLine = {
    date: Moment;
    lineno: number;
    acct: {
        name: string;
        filename: string;
    };
    [key: string]: any;
};
export declare function assertOriginLine(o: any): asserts o is OriginLine;
export declare type OriginAccount = {
    name: string;
    filename: string;
    lines: OriginLine[];
};
export declare function assertOriginAccount(o: any): asserts o is OriginAccount;
export declare type Account = {
    name: string;
    filename: string;
    settings: AccountSettings;
    lines: AccountTx[];
    origin?: OriginAccount;
};
export declare function assertAccount(a: any): asserts a is Account;
export declare type InventoryAccount = Account & {
    settings: InventoryAccountSettings;
    lines: InventoryAccountTx[];
};
export declare type LivestockInventoryAccount = InventoryAccount & {
    settings: LivestockInventoryAccountSettings;
    lines: LivestockInventoryAccountTx[];
};
export declare function assertInventoryAccount(a: any): asserts a is InventoryAccount;
export declare type AveValuePerWeightNote = {
    aveValuePerWeight: number | PriceWeightPoint[];
};
export declare function assertAveValuePerWeightNote(o: any): asserts o is AveValuePerWeightNote;
export declare function assertLivestockInventoryAccount(a: any): asserts a is LivestockInventoryAccount;
export declare type CompositeAccount = {
    lines: AccountTx[];
    accts: Account[];
};
export declare function assertCompositeAccount(c: any): asserts c is CompositeAccount;
export declare type FinalAccounts = {
    tax: CompositeAccount;
    mkt: CompositeAccount;
    originals: Account[];
};
export declare function assertFinalAccounts(a: any): asserts a is FinalAccounts;
