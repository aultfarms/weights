import oerror from '@overleaf/o-error';

type AccountInfoPrivate = {
  name: string,
  [key: string]: any,
};
type LineInfo = {
  lineno: number,
  acct?: AccountInfoPrivate,
  [key: string]: any,
};

export type MultiErrorInfo = {
  msgs: string[],
  acct?: AccountInfoPrivate,
  line?: LineInfo,
};

export class MultiError extends oerror {
  public override info: MultiErrorInfo = { msgs: [] as string[] };

  public msgs():string[] {
    return this.info.msgs;
  }

  public static wrap(e: any, msg?: string | string[]): MultiError {
    if (!(e instanceof MultiError)) {
      if (!msg || typeof msg === 'string') {
        msg = `${msg || ''}: Non-Standard Error: ${e.toString()}`;
      }
      if (typeof msg === 'string') msg = [ msg ];
      return new MultiError({ msg });
    }
    e.concat(msg || '');
    return e;
  }

  constructor({ msg }: { msg: string | string[] }) {
    // TS requires that we call super first here, which is a pain
    super('Multi-Error: ' + (typeof msg === 'string' ? msg : msg.join('\n')),
          // keep the msgs in oerror's "info" initializer
          { msgs: typeof msg === 'string' ? [msg] : msg });
  };

  // Concats this error's messages onto the end of another array of messages
  concat(msg: string | string[]) {
    if (typeof msg === 'string') msg = [ msg ];
    this.info.msgs = [ ...this.info.msgs, ...msg ];
    return this.info.msgs;
  };
}

export class AccountError extends MultiError {
  constructor(
    { msg, acct }: 
    { msg: string | string[], acct?: AccountInfoPrivate }
  ) {
    if (typeof msg === 'string') {
      msg = [ `Account Error ${acct?.name || 'unknown'}: ${msg}}` ];
    }
    super({ msg });
    this.info.acct = acct;
  }
}

export class LineError extends MultiError {
  constructor(
    { msg, line, acct }:
    { msg: string | string[], line: LineInfo, acct?: AccountInfoPrivate }
  ) {
    const name = line.acct?.name ? line.acct.name : (acct?.name || 'unknown');
    if (typeof msg === 'string') {
      msg = [ `Line Error: Account ${name}: LINE: ${line.lineno}: ${msg}` ];
    }
    super({ msg });
    this.info.line = line;
  }

  public static override wrap(e: any, line?: LineInfo | string | string[], msg?: string | string[]): LineError {
    // If they left off the line:
    if (!line || typeof line === 'string' || Array.isArray(line)) {
      msg = line || 'Error';
      line = { lineno: -1 };
    }
    if (!(e instanceof MultiError)) {
      if (!msg || typeof msg === 'string') {
        msg = `${msg || ''}: Non-Standard Error: ${e.toString()}`;
      }
      if (typeof msg === 'string') msg = [ msg ];
      return new LineError({ msg, line });
    }
    if (!msg || typeof msg === 'string') {
      msg = [ msg || 'Error' ];
    }
    const name = line?.acct?.name ? line.acct.name : 'unknown';
    const lineno = typeof line?.lineno === 'number' ? line.lineno : -1;
    msg = msg.map((s: string) => `Line Error: Acct ${name}: LINE: ${lineno}: ${s}`);
    e.concat(msg);
    return e;
  }
};
