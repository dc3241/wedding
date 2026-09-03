/** ISO date (YYYY-MM-DD) for "today" in America/Phoenix — Dom & Jordyn's timezone. */
export function adminToday(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}
