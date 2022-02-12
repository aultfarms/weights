import type {ValidatedRawTx} from "./types.js";

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
