import type { ActivityMessage } from './state';

export function linenoPrefix(str: string): string | null {
  const lineparts = str.match(/^ACCOUNT [^:]+: LINE: ([0-9]+):/);
  return lineparts?.[1] || null;
}

export function accountPrefix(str: string) : string | null {
  const accountparts = str.match(/^ACCOUNT ([^:]+):/);
  return accountparts?.[1] || null;
}

export function combinePrefixedMsgs(errs: string[] | ActivityMessage[]): typeof errs {
  if (errs.length < 1) return ([] as typeof errs);

  // Force everything into activitymessages to make TS happy:
  let amerrors: ActivityMessage[] = [];
  for (const e of errs) {
    if (typeof e === 'string') amerrors.push({ msg: e, type: 'good' });
    else amerrors.push(e);
  }

  // Check prefixes, accumulating in an index if matched:
  const nones: ActivityMessage[] = [];
  const prefixed: { [prefix: string]: ActivityMessage } = {};
  for (const e of amerrors) {
    let pfx = '';
    if (accountPrefix(e.msg)) {
      pfx += `${accountPrefix(e.msg)}-`;
      if (linenoPrefix(e.msg)) {
        pfx += linenoPrefix(e.msg);
      }
    }
    if (!pfx) {
      nones.push(e);
    } else {
      if (!prefixed[pfx]) prefixed[pfx] = { msg: '', type: e.type };
      prefixed[pfx]!.msg += `${e.msg}\n`;
    }
  }
  
  if (typeof errs[0] === 'string') {
    return ([ 
      ...nones.map(a => a.msg), 
      ...Object.values(prefixed).map(a => a.msg)
    ] as string[]);
  } else {
    return ([ 
      ...nones, 
      ...Object.values(prefixed) 
    ] as ActivityMessage[]);
  }
}
