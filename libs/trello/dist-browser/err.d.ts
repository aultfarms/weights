import oerror from '@overleaf/o-error';
declare type AccountInfoPrivate = {
    name: string;
    [key: string]: any;
};
declare type LineInfo = {
    lineno: number;
    acct?: AccountInfoPrivate;
    [key: string]: any;
};
export declare type MultiErrorInfo = {
    msgs: string[];
    acct?: AccountInfoPrivate;
    line?: LineInfo;
};
export declare class MultiError extends oerror {
    msgs(): string[];
    toString(): string;
    static wrap(e: any, msg?: string | string[]): MultiError;
    constructor({ msg, cause }: {
        msg: string | string[];
        cause?: Error;
    });
    concat(msg: string | string[]): any;
}
export declare class AccountError extends MultiError {
    constructor({ msg, acct, cause }: {
        msg: string | string[];
        acct?: AccountInfoPrivate;
        cause?: Error;
    });
    static wrap(e: any, acct?: AccountInfoPrivate | string | string[] | null, msg?: string | string[]): AccountError;
}
export declare class LineError extends MultiError {
    constructor({ msg, line, acct, cause }: {
        msg: string | string[];
        line: LineInfo | null;
        acct?: AccountInfoPrivate;
        cause?: Error;
    });
    static wrap(e: any, line?: LineInfo | string | string[] | null, msg?: string | string[]): LineError;
}
export {};
