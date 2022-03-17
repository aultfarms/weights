import type { Moment } from 'moment';

export function isSameDayOrAfter(d1: Moment, d2: Moment): boolean {
  if (d1.format('YYYY-MM-DD') === d2.format('YYYY-MM-DD')) return true; // same day
  return d1.isSameOrAfter(d2);
}

// Is d2 the same day or before d1?
export function isSameDayOrBefore(d1: Moment, d2: Moment): boolean {
  if (d1.format('YYYY-MM-DD') === d2.format('YYYY-MM-DD')) return true; // same day
  return d1.isSameOrBefore(d2);
}


