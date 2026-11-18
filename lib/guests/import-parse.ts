/**
 * GUEST-IMPORT-01 — turn a pasted list or CSV into households.
 * Pure functions (no server-only) so they can be unit-tested.
 */

export type ImportPersonType = "adult" | "child" | "plus_one";

export type ImportHousehold = {
  /** Household / envelope label, e.g. "The Garcia Family". Optional. */
  label: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  people: { name: string; type: ImportPersonType }[];
};

export const MAX_IMPORT_HOUSEHOLDS = 500;
export const MAX_IMPORT_CHARS = 60_000;

const EMAIL_RE = /[^\s<>(),;"']+@[^\s<>(),;"']+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;

function clean(value: string | null | undefined, max = 200): string | null {
  const v = (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return v ? v : null;
}

/** Minimal RFC-4180-ish CSV/TSV row parser (quoted fields, escaped quotes). */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

type Columns = Partial<
  Record<
    | "name"
    | "first"
    | "last"
    | "partner"
    | "household"
    | "email"
    | "phone"
    | "street"
    | "city"
    | "state"
    | "zip"
    | "address"
    | "kids",
    number
  >
>;

function detectColumns(header: string[]): Columns | null {
  const cols: Columns = {};
  header.forEach((raw, index) => {
    const h = raw.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    const set = (key: keyof Columns) => {
      if (cols[key] === undefined) cols[key] = index;
    };
    if (/^(first|first name|given name)$/.test(h)) set("first");
    else if (/^(last|last name|surname|family name)$/.test(h)) set("last");
    else if (/(partner|plus one|plus 1|guest 2|spouse|\+1)/.test(h)) set("partner");
    else if (/(kids|children|child)/.test(h)) set("kids");
    else if (/(household|family|party|envelope|addressed to)/.test(h)) set("household");
    else if (/(^| )(name|full name|guest|guest name)( |$)/.test(h)) set("name");
    else if (/e ?mail/.test(h)) set("email");
    else if (/(phone|mobile|cell)/.test(h)) set("phone");
    else if (/^(city|town)$/.test(h)) set("city");
    else if (/^(state|province|region)$/.test(h)) set("state");
    else if (/(zip|postal)/.test(h)) set("zip");
    else if (/(street|address 1|address line 1)/.test(h)) set("street");
    else if (/address/.test(h)) set("address");
  });
  const hasName =
    cols.name !== undefined || cols.first !== undefined || cols.household !== undefined;
  return hasName ? cols : null;
}

/** Split "Ann & Bob Lee", "Ann and Bob", "Ann, Bob" into people. */
export function splitPeople(text: string): { name: string; type: ImportPersonType }[] {
  const out: { name: string; type: ImportPersonType }[] = [];
  let working = text;
  let plusOnes = 0;
  working = working.replace(/\s*(\+\s*1|plus\s*one|and\s+guest|&\s*guest|\+\s*guest)\b\.?/gi, () => {
    plusOnes += 1;
    return "";
  });
  const parts = working
    .split(/\s*(?:&|\band\b|,|;|\/)\s*/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const CHILD_TAG = /\((kid|kids|child|age\s*\d+)\)|\b(kid|child)\b/i;
  const stripTags = (p: string) =>
    p.replace(/\((kid|kids|child|age\s*\d+)\)/gi, "").replace(/\s+/g, " ").trim();
  // "Ann & Bob Lee" → give Ann the shared last name (only when the last
  // person has exactly first + last and the others are single words).
  const lastWords = parts.length > 1 ? stripTags(parts[parts.length - 1]!).split(" ") : [];
  const shared = lastWords.length === 2 ? lastWords[1]! : "";
  parts.forEach((part) => {
    const isChild = CHILD_TAG.test(part);
    let name = stripTags(part);
    if (shared && name && !name.includes(" ")) name = `${name} ${shared}`;
    if (name) out.push({ name: name.slice(0, 120), type: isChild ? "child" : "adult" });
  });
  for (let i = 0; i < plusOnes && out.length > 0; i++) {
    out.push({ name: "Guest", type: "plus_one" });
  }
  return out;
}

function fromColumns(rows: string[][], cols: Columns): ImportHousehold[] {
  const get = (row: string[], key: keyof Columns) =>
    cols[key] === undefined ? "" : (row[cols[key]!] ?? "").trim();
  const out: ImportHousehold[] = [];
  for (const row of rows) {
    const full =
      get(row, "name") || [get(row, "first"), get(row, "last")].filter(Boolean).join(" ");
    const people = full ? splitPeople(full) : [];
    const partner = get(row, "partner");
    if (partner) {
      if (/^(yes|y|true|1|\+1|guest)$/i.test(partner)) people.push({ name: "Guest", type: "plus_one" });
      else people.push(...splitPeople(partner));
    }
    const kids = get(row, "kids");
    if (kids && !/^(no|n|0|none|false)$/i.test(kids)) {
      if (/^\d+$/.test(kids)) {
        for (let i = 0; i < Math.min(Number(kids), 8); i++) people.push({ name: "Child", type: "child" });
      } else {
        for (const kid of splitPeople(kids)) people.push({ name: kid.name, type: "child" });
      }
    }
    const householdLabel = get(row, "household");
    if (people.length === 0 && householdLabel) people.push(...splitPeople(householdLabel));
    if (people.length === 0) continue;
    const address =
      get(row, "address") ||
      [get(row, "street"), get(row, "city"), [get(row, "state"), get(row, "zip")].filter(Boolean).join(" ")]
        .filter(Boolean)
        .join(", ");
    out.push({
      label: clean(householdLabel),
      email: clean(get(row, "email").match(EMAIL_RE)?.[0] ?? null),
      phone: clean(get(row, "phone")),
      address: clean(address, 300),
      people: people.slice(0, 12),
    });
  }
  return out;
}

/** Deterministic parse. Returns null when the text isn't a recognizable table. */
export function parseGuestTable(text: string): ImportHousehold[] | null {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(",") ? "," : null;
  if (!delimiter) return null;
  const rows = parseDelimited(text, delimiter);
  if (rows.length < 2) return null;
  const cols = detectColumns(rows[0]!);
  if (!cols) return null;
  return fromColumns(rows.slice(1), cols).slice(0, MAX_IMPORT_HOUSEHOLDS);
}

/** Fallback: one non-empty line = one household. */
export function parseGuestLines(text: string): ImportHousehold[] {
  const out: ImportHousehold[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    let line = rawLine.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim();
    if (!line) continue;
    const email = line.match(EMAIL_RE)?.[0] ?? null;
    if (email) line = line.replace(email, "");
    const phone = line.match(PHONE_RE)?.[0] ?? null;
    if (phone) line = line.replace(phone, "");
    line = line.replace(/[<>|\-–—:]+\s*$/g, "").replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim();
    // "The Smiths: Mary, John" → label + people.
    let label: string | null = null;
    const labelled = /^([^:]{2,60}):\s*(.+)$/.exec(line);
    if (labelled) {
      label = labelled[1]!.trim();
      line = labelled[2]!.trim();
    }
    const people = splitPeople(line);
    if (people.length === 0) continue;
    out.push({ label: clean(label), email: clean(email), phone: clean(phone), address: null, people: people.slice(0, 12) });
    if (out.length >= MAX_IMPORT_HOUSEHOLDS) break;
  }
  return out;
}

/** Validate untrusted household JSON (model output or client round-trip). */
export function sanitizeHouseholds(value: unknown): ImportHousehold[] {
  if (!Array.isArray(value)) return [];
  const out: ImportHousehold[] = [];
  for (const raw of value.slice(0, MAX_IMPORT_HOUSEHOLDS)) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const peopleRaw = Array.isArray(r.people) ? r.people : [];
    const people = peopleRaw
      .map((p) => {
        const pr = (p ?? {}) as Record<string, unknown>;
        const name = clean(typeof pr.name === "string" ? pr.name : null, 120);
        const type: ImportPersonType =
          pr.type === "child" ? "child" : pr.type === "plus_one" ? "plus_one" : "adult";
        return name ? { name, type } : null;
      })
      .filter((p): p is { name: string; type: ImportPersonType } => p !== null)
      .slice(0, 12);
    // The first person anchors the household and must be an adult.
    if (people.length === 0 || people[0]!.type !== "adult") continue;
    const str = (k: string, max?: number) => clean(typeof r[k] === "string" ? (r[k] as string) : null, max);
    const email = str("email");
    out.push({
      label: str("label"),
      email: email && EMAIL_RE.test(email) ? email : null,
      phone: str("phone", 40),
      address: str("address", 300),
      people,
    });
  }
  return out;
}
