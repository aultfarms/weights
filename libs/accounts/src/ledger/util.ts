import type {ValidatedRawTx, ValidatedRawSheetAccount, Account} from "./types.js";
import rfdc from 'rfdc'; // really fast deep clone
import moment from 'moment';
import omit from 'omit';
import { stringify } from '../stringify.js';

const deepclone = rfdc({ proto: true });

export function weHave(v: any) {
  if (typeof v === 'string') return v !== '';
  return typeof v !== 'undefined';
}

export function isStart(tx: any): boolean {
  return !!Object.values(tx).find((v: any) => {
    if (!v || typeof v !== 'string') return false;
    return v.toString()?.trim() === 'START';
  });
};

export function mapSkipErrors(
  lines: ValidatedRawTx[], 
  mapper: (l: ValidatedRawTx, i?: number) => ValidatedRawTx
): ValidatedRawTx[] {
  return lines.map((l,i) => {
    if (l.errors && l.errors.length > 0) return l;
    return mapper(l,i);
  });
}

export function moneyEquals(a:number, b: number): boolean {
  return (Math.abs(a-b) < 0.01);
}

export function integerEquals(a: number, b: number): boolean {
  return (Math.abs(a-b) < 1);
}

export function line2Str(l: any) {
  l = deepclone(l); // copy the line object
  l.acct = "<"+l.acct.name+">";
  let originLineStr = `<OriginLine: {`;
  if (weHave(l.originLine?.taxPriorValue)) originLineStr += ` taxPriorValue: ${l.originLine.taxPriorValue} `;
  if (weHave(l.originLine?.mktPriorValue)) originLineStr += ` mktPriorValue: ${l.originLine.mktPriorValue} `;
  if (weHave(l.originLine?.taxCurrentValue)) originLineStr += ` taxCurrentValue: ${l.originLine.taxCurrentValue} `;
  if (weHave(l.originLine?.mktCurrentValue)) originLineStr += ` mktCurrentValue: ${l.originLine.mktCurrentValue} `;
  originLineStr += '}>';
  l.originLine = originLineStr;
  if (l.date && moment.isMoment(l.date)) {
    l.date = l.date.format('YYYY-MM-DD');
  }
  if (l.priorDate && moment.isMoment(l.priorDate)) {
    l.priorDate = l.priorDate.format('YYYY-MM-DD');
  }
  //return JSON.stringify(l,null,'  ');
  return stringify(l);
}
export function ledger2Str(acct: ValidatedRawSheetAccount | Account) {
  return 'ACCOUNT: \n' + stringify(
    // get rid of acct lines and origin.lines
    omit(['lines'])({
      ...acct, 
      origin: omit(['lines'])(acct.origin),
    })
  // remove the outer {} and indentation for main account info
  ).replace(/^{/g,'').replace(/}$/g,'').replace(/^  /g,'') + '\n' + acct.lines.map(line2Str).join('\n');
}

export async function breakExecution() {
  return new Promise(resolve => setTimeout(resolve, 0));
}
