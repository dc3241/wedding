/**
 * Live checkpoint: structured-output plan generation should parse on every try.
 * Fixture matches the previously failing profile (black-tie / Black & White / venue booked).
 * Run: node scripts/checkpoint-structured-plan.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ATTEMPTS = Number(process.env.REPRO_ATTEMPTS ?? 5);

const VENDOR_IDS = [
  "venue",
  "caterer",
  "florist",
  "baker",
  "hair-makeup",
  "jewelry",
  "photographer",
  "videographer",
  "dj",
  "band",
  "officiant",
  "planner",
  "rentals",
];

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

const schema = {
  type: "object",
  additionalProperties: false,
  required: ["checklist", "budget", "vendorCategories"],
  properties: {
    checklist: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "monthsBeforeWedding"],
        properties: {
          title: { type: "string" },
          monthsBeforeWedding: { type: "integer" },
        },
      },
    },
    budget: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "plannedAmount"],
        properties: {
          category: { type: "string" },
          plannedAmount: { type: "number" },
        },
      },
    },
    vendorCategories: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "note"],
        properties: {
          category: { type: "string", enum: VENDOR_IDS },
          note: { type: "string" },
        },
      },
    },
  },
};

const prompt = `Create a personalized starting wedding plan for this couple.

Couple / project: Repro couple
Wedding date: 2026-12-15
Today: 2026-08-26
Runway: 3 whole months until the wedding
Location: New York, NY
Estimated guests: 150
Total budget target: $75000
Style & vibe: Black & White
Traditions to honor: none specified
Top priorities: none specified
Formality: black-tie
Priority vendor categories: none specified
Already booked (do not suggest finding a vendor for these): venue
Anything else: none

Guidance:
- Include 10–18 checklist tasks. monthsBeforeWedding is whole months before the wedding (0 for week-of tasks).
- Every monthsBeforeWedding MUST be <= 3. For a short runway, compress the plan into the available months rather than emitting a 12-month horizon.
- Budget categories should sum to roughly the couple's total budget target (within about 10% if a target is given).
- For already-booked vendor categories, do NOT generate a checklist task for finding or hiring a vendor in that category, and do NOT include it in vendorCategories.
- vendorCategories[].category MUST be exactly one of these ids: ${VENDOR_IDS.join(", ")}.`;

function looksValid(parsed) {
  return (
    parsed &&
    Array.isArray(parsed.checklist) &&
    parsed.checklist.length > 0 &&
    Array.isArray(parsed.budget) &&
    parsed.budget.length > 0 &&
    Array.isArray(parsed.vendorCategories) &&
    parsed.checklist.every(
      (item) =>
        typeof item?.title === "string" &&
        item.title.trim() &&
        typeof item.monthsBeforeWedding === "number",
    ) &&
    parsed.budget.every(
      (item) =>
        typeof item?.category === "string" &&
        item.category.trim() &&
        typeof item.plannedAmount === "number",
    )
  );
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
      max_tokens: 8192,
      system:
        "You are a wedding planning assistant. Produce a complete starting plan for this couple.",
      messages: [{ role: "user", content: prompt }],
      output_config: { format: { type: "json_schema", schema } },
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
      bodyPreview: bodyText.slice(0, 800),
    };
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch (e) {
    return { n, ok: false, kind: "envelope_parse", elapsedMs, error: String(e) };
  }

  const raw = data.content?.find((b) => b.type === "text")?.text;
  if (!raw) {
    return {
      n,
      ok: false,
      kind: "no_text",
      elapsedMs,
      stop_reason: data.stop_reason,
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const valid = looksValid(parsed);
    return {
      n,
      ok: valid,
      kind: valid ? "ok" : "invalid_shape",
      elapsedMs,
      chars: raw.length,
      stop_reason: data.stop_reason,
      checklistLen: parsed.checklist?.length,
      budgetLen: parsed.budget?.length,
      vendorLen: parsed.vendorCategories?.length,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      n,
      ok: false,
      kind: "json_parse",
      elapsedMs,
      chars: raw.length,
      error: msg,
      stop_reason: data.stop_reason,
    };
  }
}

console.log("=== Structured-output checkpoint ===");
console.log({ model, attempts: ATTEMPTS });

const results = [];
for (let i = 1; i <= ATTEMPTS; i++) {
  console.log(`\n--- attempt ${i}/${ATTEMPTS} ---`);
  const r = await oneAttempt(i);
  results.push(r);
  console.log(r);
}

const byKind = {};
for (const r of results) {
  const k = r.ok ? "ok" : r.kind;
  byKind[k] = (byKind[k] ?? 0) + 1;
}
console.log("\n=== Summary ===");
console.log(byKind);

const allOk = results.every((r) => r.ok);
process.exit(allOk ? 0 : 1);
