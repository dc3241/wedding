/**
 * Recon: repeat callClaudeForWeddingPlan-shaped Anthropic calls and catch
 * JSON.parse failures with a window around the error offset.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ATTEMPTS = Number(process.env.REPRO_ATTEMPTS ?? 8);

function loadEnvLocal() {
  const raw = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const apiKey = process.env.MODEL_API_KEY;
const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

if (!apiKey) {
  console.error("Missing MODEL_API_KEY");
  process.exit(1);
}

function stripJsonFences(raw) {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function wholeMonthsBetween(fromIso, toIso) {
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

// Same fixture shape as the live failing project profile
const project = {
  name: "Repro couple",
  wedding_date: "2026-12-15",
  total_budget: 75000,
};
const profile = {
  location: "New York, NY",
  guest_estimate: 150,
  style: "Black & White",
  traditions: null,
  priorities: null,
  vibe_notes: null,
  formality: "black-tie",
  priority_vendor_category_ids: [],
  already_booked_vendor_category_ids: ["venue"],
};

const todayIso = todayIsoDate();
const runwayMonths =
  project.wedding_date != null
    ? Math.max(0, wholeMonthsBetween(todayIso, project.wedding_date))
    : null;

const vendorCategoryIds =
  "venue, caterer, photographer, videographer, florist, cake, music, entertainment, officiant, planner, beauty, attire, stationery, rentals, transportation, hotel, other";

const prompt = `Create a personalized starting wedding plan for this couple.

Couple / project: ${project.name}
Wedding date: ${project.wedding_date ?? "not set yet"}
Today: ${todayIso}
Runway: ${runwayMonths !== null ? `${runwayMonths} whole months until the wedding` : "unknown (wedding date not set yet)"}
Location: ${profile.location ?? "not specified"}
Estimated guests: ${profile.guest_estimate ?? "not specified"}
Total budget target: ${project.total_budget != null ? `$${project.total_budget}` : "not specified"}
Style & vibe: ${profile.style ?? "not specified"}
Traditions to honor: ${profile.traditions ?? "none specified"}
Top priorities: ${profile.priorities ?? "none specified"}
Formality: ${profile.formality ?? "not specified"}
Priority vendor categories: none specified
Already booked (do not suggest finding a vendor for these): venue
Anything else: none

Return STRICT JSON ONLY — no prose, no markdown, no code fences — matching exactly this shape:
{
  "checklist": [ { "title": string, "monthsBeforeWedding": number } ],
  "budget": [ { "category": string, "plannedAmount": number } ],
  "vendorCategories": [ { "category": string, "note": string } ]
}

Guidance:
- Include 10–18 checklist tasks with monthsBeforeWedding as whole months before the wedding (0 for week-of tasks).
- Every monthsBeforeWedding MUST be <= ${runwayMonths}. For a short runway, compress the plan into the available months rather than emitting a 12-month horizon.
- Budget categories should sum to roughly the couple's total budget target (within about 10% if a target is given).
- Reflect their style, traditions, and priorities in task titles, budget splits, and vendor category notes.
- For already-booked vendor categories, do NOT generate a checklist task for finding or hiring a vendor in that category, and do NOT include it in vendorCategories — the couple already has this vendor.
- vendorCategories[].category MUST be exactly one of these ids (no labels, no synonyms): ${vendorCategoryIds}.
- Include essential vendor categories from that id list tailored to their wedding. note stays free text.`;

function windowAround(text, pos, radius = 120) {
  const start = Math.max(0, pos - radius);
  const end = Math.min(text.length, pos + radius);
  return {
    start,
    end,
    pos,
    snippet: text.slice(start, end),
    caretLine:
      text.slice(start, pos).replace(/[^\n]/g, " ") +
      "^" +
      "  <-- parse offset",
  };
}

async function oneAttempt(n) {
  const started = Date.now();
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system:
        "You are a wedding planning assistant. Respond with STRICT JSON ONLY — no prose, no markdown, no code fences.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const elapsedMs = Date.now() - started;
  const bodyText = await response.text();

  if (!response.ok) {
    return {
      n,
      ok: false,
      kind: "http",
      status: response.status,
      elapsedMs,
      bodyPreview: bodyText.slice(0, 500),
    };
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch (e) {
    return {
      n,
      ok: false,
      kind: "envelope_parse",
      elapsedMs,
      error: String(e),
      bodyPreview: bodyText.slice(0, 500),
    };
  }

  const raw = data.content?.find((b) => b.type === "text")?.text;
  if (!raw) {
    return { n, ok: false, kind: "no_text", elapsedMs, stop_reason: data.stop_reason };
  }

  const stripped = stripJsonFences(raw);
  try {
    const parsed = JSON.parse(stripped);
    return {
      n,
      ok: true,
      elapsedMs,
      chars: stripped.length,
      checklistLen: parsed.checklist?.length,
      budgetLen: parsed.budget?.length,
      vendorLen: parsed.vendorCategories?.length,
      stop_reason: data.stop_reason,
      usage: data.usage,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const m = msg.match(/position (\d+)/i);
    const pos = m ? Number(m[1]) : 2313;
    const win = windowAround(stripped, pos, 150);
    return {
      n,
      ok: false,
      kind: "json_parse",
      elapsedMs,
      chars: stripped.length,
      error: msg,
      stop_reason: data.stop_reason,
      usage: data.usage,
      window: win,
      // Full raw for the failing case — dump to stdout separately
      fullRaw: stripped,
    };
  }
}

console.log("=== Repro config ===");
console.log({ model, attempts: ATTEMPTS, formality: profile.formality, style: profile.style, alreadyBooked: profile.already_booked_vendor_category_ids });

const results = [];
for (let i = 1; i <= ATTEMPTS; i++) {
  console.log(`\n--- attempt ${i}/${ATTEMPTS} ---`);
  const r = await oneAttempt(i);
  results.push(r);
  if (r.kind === "json_parse") {
    console.log("PARSE FAILURE");
    console.log({
      error: r.error,
      chars: r.chars,
      elapsedMs: r.elapsedMs,
      stop_reason: r.stop_reason,
      window: r.window,
    });
    console.log("\n=== FULL RAW (failing) ===\n");
    console.log(r.fullRaw);
    // Keep going to see frequency, but dump first failure fully
  } else {
    console.log(r);
  }
}

console.log("\n=== Summary ===");
const byKind = {};
for (const r of results) {
  const k = r.ok ? "ok" : r.kind;
  byKind[k] = (byKind[k] ?? 0) + 1;
}
console.log(byKind);
