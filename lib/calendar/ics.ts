/**
 * CAL-FEED-01 — minimal RFC 5545 writer for the private calendar feed.
 * Pure (no server-only) so it can be unit-tested.
 */

export type IcsEvent = {
  uid: string;
  title: string;
  /** All-day: YYYY-MM-DD. Timed: ISO timestamp (UTC). */
  start: string;
  /** Timed events only; ISO timestamp. */
  end?: string | null;
  allDay: boolean;
  location?: string | null;
  description?: string | null;
  url?: string | null;
};

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
export function foldLine(line: string): string {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes.encode(current + ch).length > limit) {
      out.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) out.push(current);
  return out.join("\r\n ");
}

function utcStamp(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function dateValue(key: string): string {
  return key.replace(/-/g, "");
}

function nextDay(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildIcs(input: {
  calendarName: string;
  events: IcsEvent[];
  now?: Date;
}): string {
  const stamp = utcStamp((input.now ?? new Date()).toISOString());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//First Look//Wedding calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(input.calendarName)}`,
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];
  for (const event of input.events) {
    lines.push("BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${stamp}`);
    if (event.allDay) {
      const key = event.start.slice(0, 10);
      lines.push(`DTSTART;VALUE=DATE:${dateValue(key)}`, `DTEND;VALUE=DATE:${dateValue(nextDay(key))}`);
    } else {
      lines.push(`DTSTART:${utcStamp(event.start)}`);
      const end =
        event.end && new Date(event.end) > new Date(event.start)
          ? event.end
          : new Date(new Date(event.start).getTime() + 60 * 60 * 1000).toISOString();
      lines.push(`DTEND:${utcStamp(end)}`);
    }
    lines.push(`SUMMARY:${escapeIcsText(event.title)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
