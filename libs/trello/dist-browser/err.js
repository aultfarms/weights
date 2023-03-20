import oerror from '@overleaf/o-error';
import { line2Str } from './ledger/util.js';
import debug from 'debug';
const warn = debug('af/accounts#err:warn');
export class MultiError extends oerror {
    //  public override info: MultiErrorInfo = { msgs: [] as string[] };
    msgs() {
        return this.info.msgs;
    }
    toString() {
        return super.toString() + this.msgs().join('\n') + oerror.getFullInfo(this) + oerror.getFullStack(this);
    }
    static wrap(e, msg) {
        try {
            if (!(e instanceof MultiError)) {
                if (!msg || typeof msg === 'string') {
                    msg = `${msg || ''}: Non-Standard Error: ${e.toString()}`;
                }
                if (typeof msg === 'string')
                    msg = [msg];
                oerror.tag(e, `Non-standard error`);
                e = new MultiError({ msg, cause: e });
                return e;
            }
            if (!msg)
                msg = [''];
            if (typeof msg === 'string') {
                msg = [msg];
            }
            e.concat(msg || '');
            oerror.tag(e);
            return e;
        }
        catch (e) {
            warn('WARNING: failed to construct MultiError with message', msg);
            throw oerror.tag(e, 'Failed to construct MultiError for message ' + msg?.toString());
        }
    }
    constructor({ msg, cause }) {
        if (typeof msg === 'string') {
            msg = [msg];
        }
        if (cause)
            msg.push(cause.message);
        super(msg.join('\n'), { msgs: msg }, cause);
        // I thought that call to super would set the info object, but it isn't,
        // so I'll do it myself here:
        this.info = { msgs: msg };
    }
    ;
    // Concats this error's messages onto the end of another array of messages
    concat(msg) {
        if (!msg)
            msg = '';
        if (typeof msg === 'string')
            msg = [msg];
        this.info.msgs = [...this.info.msgs, ...msg];
        return this.info.msgs;
    }
    ;
}
export class AccountError extends MultiError {
    constructor({ msg, acct, cause }) {
        try {
            if (typeof msg === 'string') {
                msg = [`ACCOUNT ${acct?.name || 'unknown'}: ${msg}`];
            }
            else {
                msg = msg.map(m => `ACCOUNT ${acct?.name || 'unknown'}: ${m}`);
            }
            super({ msg, cause });
            if (acct) {
                this.info.acct = {
                    name: acct.name,
                    filename: acct.filename,
                };
            }
        }
        catch (e) {
            warn('WARNING: failed to construct AccountError for cause', cause);
            throw oerror.tag(e, 'Failed to construct MultiError for cause ' + cause?.toString());
        }
    }
    ;
    static wrap(e, acct, msg) {
        // If they left off the acct:
        if (typeof acct !== 'object' || Array.isArray(acct) || !acct) {
            msg = msg || acct || '<empty message>';
            acct = 'unknown';
        }
        const name = (typeof acct === 'string') ? acct : acct.name;
        if (!(e instanceof MultiError)) {
            if (!msg || typeof msg === 'string') {
                msg = `${msg || ''}: Non-Standard Error: ${e.toString()}`;
            }
            if (typeof msg === 'string')
                msg = [msg];
            oerror.tag(e, msg.join('\n'));
            return new AccountError({ msg, acct: { name }, cause: e });
        }
        if (!msg || typeof msg === 'string') {
            msg = [msg || 'Error'];
        }
        msg = msg.map((s) => `ACCOUNT ${name}: ${s}`);
        e.concat(msg);
        oerror.tag(e);
        return e;
    }
}
;
export class LineError extends MultiError {
    constructor({ msg, line, acct, cause }) {
        try {
            if (!line)
                line = { acct: { name: acct?.name || 'unknown' }, lineno: -1 };
            const name = line.acct?.name ? line.acct.name : (acct?.name || 'unknown');
            if (typeof msg === 'string') {
                msg = [msg];
            }
            msg = msg.map(m => `ACCOUNT ${name}: LINE: ${line?.lineno}: ${m}`);
            super({ msg, cause });
            this.info.line = line2Str(line);
        }
        catch (e) {
            warn('ERROR: unable to construct LineError for cause ', cause);
            throw oerror.tag(e, 'ERROR: unable to construct LineError for cause ' + cause?.toString());
        }
    }
    static wrap(e, line, msg) {
        // If they left off the line:
        if (!line || typeof line === 'string' || Array.isArray(line)) {
            msg = line || 'Error';
            line = { lineno: -1 };
        }
        if (!(e instanceof MultiError)) {
            if (!msg || typeof msg === 'string') {
                msg = `${msg || ''}: Non-Standard Error: ${e.toString()}`;
            }
            if (typeof msg === 'string')
                msg = [msg];
            oerror.tag(e, msg.join('\n'));
            return new LineError({ msg, line, cause: e });
        }
        if (!msg || typeof msg === 'string') {
            msg = [msg || 'Error'];
        }
        const name = line?.acct?.name ? line.acct.name : 'unknown';
        const lineno = typeof line?.lineno === 'number' ? line.lineno : -1;
        msg = msg.map((s) => `ACCOUNT ${name}: LINE: ${lineno}: ${s}`);
        e.concat(msg);
        oerror.tag(e);
        return e;
    }
}
;
//# sourceMappingURL=err.js.map