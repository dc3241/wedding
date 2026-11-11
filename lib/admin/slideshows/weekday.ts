/** 0 = Sunday … 6 = Saturday for an ISO date (YYYY-MM-DD). */
export function weekdayOf(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}
