/** Parse YYYY-MM-DD into calendar parts (local, no TZ shift). */
function parseIsoDate(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Last calendar day of year/month (month is 1-indexed). */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Subtract `n` whole months from an ISO date, clamping the day to the last
 * valid day of the target month (Jan 31 − 1 month → Feb 28/29, never Mar 3).
 */
export function monthsBefore(isoDate: string, n: number): string {
  const { year, month, day } = parseIsoDate(isoDate);
  const totalMonths = year * 12 + (month - 1) - n;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const clampedDay = Math.min(day, lastDayOfMonth(targetYear, targetMonth));
  return formatIsoDate(targetYear, targetMonth, clampedDay);
}

/**
 * Floored whole-month count from `fromIso` to `toIso`.
 * Negative if `toIso` is earlier than `fromIso`.
 */
export function wholeMonthsBetween(fromIso: string, toIso: string): number {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  let months = (to.year - from.year) * 12 + (to.month - from.month);
  if (to.day < from.day) {
    months -= 1;
  }
  return months;
}
