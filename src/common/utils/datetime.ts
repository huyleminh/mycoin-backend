export function getCurrentTimestampAsSecond(): number {
    return Math.round(new Date().getTime() / 1000);
}
