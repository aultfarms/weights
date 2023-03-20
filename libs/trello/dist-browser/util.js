export function isSameDayOrAfter(d1, d2) {
    if (d1.format('YYYY-MM-DD') === d2.format('YYYY-MM-DD'))
        return true; // same day
    return d1.isSameOrAfter(d2);
}
export function isAfterDay(d1, d2) {
    if (d1.format('YYYY-MM-DD') === d2.format('YYYY-MM-DD'))
        return false; // same day
    return d1.isAfter(d2);
}
// Is d2 the same day or before d1?
export function isSameDayOrBefore(d1, d2) {
    if (d1.format('YYYY-MM-DD') === d2.format('YYYY-MM-DD'))
        return true; // same day
    return d1.isSameOrBefore(d2);
}
export function isBeforeDay(d1, d2) {
    if (d1.format('YYYY-MM-DD') === d2.format('YYYY-MM-DD'))
        return false; // same day
    return d1.isBefore(d2);
}
export function isSameDay(d1, d2) {
    return (d1.format('YYYY-MM-DD') === d2.format('YYYY-MM-DD'));
}
//# sourceMappingURL=util.js.map