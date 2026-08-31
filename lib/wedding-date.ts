const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MONTH_INDEX: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const MONTH_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function parseWeddingDate(
  value: string | null,
): { ok: true; date: string | null } | { ok: false; error: string } {
  if (value === null) {
    return { ok: true, date: null };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter a valid date." };
  }

  if (!ISO_DATE.test(trimmed)) {
    return { ok: false, error: "Enter a valid date." };
  }

  const parsed = new Date(trimmed + "T00:00:00");
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Enter a valid date." };
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  if (`${year}-${month}-${day}` !== trimmed) {
    return { ok: false, error: "Enter a valid date." };
  }

  return { ok: true, date: trimmed };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoFromParts(year: number, month: number, day: number): string | null {
  const iso = `${year}-${pad2(month)}-${pad2(day)}`;
  const parsed = parseWeddingDate(iso);
  return parsed.ok ? parsed.date : null;
}

function monthFromName(raw: string): number | null {
  const key = raw.toLowerCase().replace(/\.$/, "");
  return MONTH_INDEX[key] ?? null;
}

type IsoParts = { year: number; month: number; day: number };

function partsFromIso(iso: string): IsoParts {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** Parse a typed date (ISO, M/D/YYYY, Month D, YYYY) into YYYY-MM-DD. */
export function parseLooseDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (ISO_DATE.test(trimmed)) {
    const parsed = parseWeddingDate(trimmed);
    return parsed.ok ? parsed.date : null;
  }

  const numeric = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (numeric) {
    return isoFromParts(
      Number(numeric[3]),
      Number(numeric[1]),
      Number(numeric[2]),
    );
  }

  const long = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (long) {
    const month = monthFromName(long[1] ?? "");
    if (month == null) return null;
    return isoFromParts(Number(long[3]), month, Number(long[2]));
  }

  return null;
}

function parseMonthYear(
  value: string,
): { year: number; month: number; abbreviated: boolean } | null {
  const match = value.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return null;
  const month = monthFromName(match[1] ?? "");
  if (month == null) return null;
  const year = Number(match[2]);
  if (year < 1900 || year > 2200) return null;
  const abbreviated = (match[1] ?? "").replace(/\.$/, "").length <= 4;
  return { year, month, abbreviated };
}

/** True when the whole string is a calendar date or month-year, not a couple name. */
export function isDateOnlyProjectName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return parseLooseDate(trimmed) !== null || parseMonthYear(trimmed) !== null;
}

function formatNumeric(iso: string, pad: boolean, sep: string): string {
  const { year, month, day } = partsFromIso(iso);
  return pad
    ? `${pad2(month)}${sep}${pad2(day)}${sep}${year}`
    : `${month}${sep}${day}${sep}${year}`;
}

function formatLong(iso: string, abbreviated: boolean, comma: boolean): string {
  const { year, month, day } = partsFromIso(iso);
  const label = abbreviated ? MONTH_SHORT[month - 1] : MONTH_LONG[month - 1];
  return comma ? `${label} ${day}, ${year}` : `${label} ${day} ${year}`;
}

function formatMonthYear(iso: string, abbreviated: boolean): string {
  const { year, month } = partsFromIso(iso);
  const label = abbreviated ? MONTH_SHORT[month - 1] : MONTH_LONG[month - 1];
  return `${label} ${year}`;
}

/** Re-render `iso` in the same style as `template`. */
function restyleDate(template: string, iso: string): string {
  const trimmed = template.trim();
  if (ISO_DATE.test(trimmed)) return iso;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return formatNumeric(iso, true, "/");
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    return formatNumeric(iso, false, "/");
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return formatNumeric(iso, true, "-");
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    return formatNumeric(iso, false, "-");
  }
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(trimmed)) {
    return formatNumeric(iso, false, ".");
  }
  const long = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(,)?\s+(\d{4})$/);
  if (long) {
    const abbreviated = (long[1] ?? "").replace(/\.$/, "").length <= 4;
    return formatLong(iso, abbreviated, Boolean(long[3]));
  }
  const monthYear = parseMonthYear(trimmed);
  if (monthYear) return formatMonthYear(iso, monthYear.abbreviated);
  return formatNumeric(iso, false, "/");
}

function dateFragmentsFor(iso: string): string[] {
  const { year, month, day } = partsFromIso(iso);
  const long = MONTH_LONG[month - 1];
  const short = MONTH_SHORT[month - 1];
  return [
    iso,
    `${month}/${day}/${year}`,
    `${pad2(month)}/${pad2(day)}/${year}`,
    `${month}-${day}-${year}`,
    `${pad2(month)}-${pad2(day)}-${year}`,
    `${month}.${day}.${year}`,
    `${long} ${day}, ${year}`,
    `${long} ${day} ${year}`,
    `${short} ${day}, ${year}`,
    `${short} ${day} ${year}`,
    `${long} ${year}`,
    `${short} ${year}`,
  ];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceDateFragments(
  name: string,
  oldIso: string,
  newIso: string | null,
): string {
  const fragments = [...dateFragmentsFor(oldIso)].sort(
    (a, b) => b.length - a.length,
  );
  let result = name;
  for (const fragment of fragments) {
    const pattern = new RegExp(escapeRegExp(fragment), "gi");
    if (!pattern.test(result)) continue;
    const replacement = newIso ? restyleDate(fragment, newIso) : "";
    result = result.replace(new RegExp(escapeRegExp(fragment), "gi"), replacement);
  }
  return result
    .replace(/\s*[—–]\s*$/g, "")
    .replace(/\s+-\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Keep `projects.name` from going stale when the wedding date changes.
 * Date-only names (typed at signup as "the wedding name") fall back to the
 * couple/account name. Compound titles ("Maya & Jordan — Feb 2027") have the
 * date fragment rewritten in place.
 */
export function syncProjectNameWithWeddingDate(args: {
  currentName: string;
  previousDate: string | null;
  nextDate: string | null;
  accountName?: string | null;
  /** Personal/couple accounts: a date-only title should become the couple names. */
  preferAccountName?: boolean;
}): string {
  const name = args.currentName.trim();
  const account = args.accountName?.trim() || null;
  const accountIsUsable = Boolean(
    args.preferAccountName && account && !isDateOnlyProjectName(account),
  );

  if (isDateOnlyProjectName(name)) {
    if (accountIsUsable) return account as string;
    if (args.nextDate) return restyleDate(name, args.nextDate);
    return "Your wedding";
  }

  if (args.previousDate && name) {
    const replaced = replaceDateFragments(
      name,
      args.previousDate,
      args.nextDate,
    );
    if (replaced) return replaced;
    if (accountIsUsable) return account as string;
    return "Your wedding";
  }

  return name;
}

export function displayCoupleNames(projectName: string): string {
  const trimmed = projectName.trim();
  if (!trimmed || isDateOnlyProjectName(trimmed)) return "Your wedding";
  return trimmed;
}

export function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function projectWorkspaceEyebrow(
  projectName: string | null | undefined,
  weddingDate: string | null | undefined,
): string {
  const raw = projectName?.trim() || "Your wedding";
  const label = isDateOnlyProjectName(raw) ? null : raw;
  if (weddingDate) {
    const date = formatEyebrowDate(weddingDate);
    return label ? `${label} · ${date}` : date;
  }
  return label || "Your wedding";
}
