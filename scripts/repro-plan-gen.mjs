/**
 * One-off diagnostic: reproduce callClaudeForWeddingPlan for a project_id.
 * Logs raw Anthropic HTTP status/body and validation outcomes.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = "492d94a3-d439-4981-8ddb-5b1fbcfa5f68";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.MODEL_API_KEY;
const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

if (!supabaseUrl || !serviceKey || !apiKey) {
  console.error("Missing env:", {
    supabaseUrl: !!supabaseUrl,
    serviceKey: !!serviceKey,
    apiKey: !!apiKey,
  });
  process.exit(1);
}

async function supabaseGet(table, query) {
  const url = `${supabaseUrl}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) {
    throw new Error(`${table} fetch ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function todayIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function wholeMonthsBetween(fromIso, toIso) {
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

let project = null;
let profile = null;

try {
  const [projects, profiles] = await Promise.all([
    supabaseGet("projects", `id=eq.${PROJECT_ID}&select=name,wedding_date,total_budget`),
    supabaseGet(
      "wedding_profile",
      `project_id=eq.${PROJECT_ID}&select=location,guest_estimate,style,traditions,priorities,vibe_notes,formality,priority_vendor_category_ids,already_booked_vendor_category_ids,include_checklist,include_budget,include_vendors`,
    ),
  ]);
  project = projects[0] ?? null;
  profile = profiles[0] ?? null;
} catch (err) {
  console.warn("Supabase fetch failed; using supplied fixture:", err.message);
}

if (!project) {
  project = {
    name: "Repro couple",
    wedding_date: "2026-12-15",
    total_budget: 75000,
  };
  profile = {
    location: "New York, NY",
    guest_estimate: 150,
    style: "Black & White",
    traditions: null,
    priorities: null,
    vibe_notes: null,
    formality: "black-tie",
    priority_vendor_category_ids: [],
    already_booked_vendor_category_ids: ["venue"],
    include_checklist: true,
    include_budget: false,
    include_vendors: false,
  };
}

console.log("=== Project / profile ===");
console.log(JSON.stringify({ projectId: PROJECT_ID, project, profile }, null, 2));

const todayIso = todayIsoDate();
const runwayMonths =
  project?.wedding_date != null
    ? Math.max(0, wholeMonthsBetween(todayIso, project.wedding_date))
    : null;

const vendorCategoryIds =
  "venue,catering,photography,videography,florist,music,dj,band,officiant,planner,hair-makeup,transportation,rentals,cake,stationery,attire";

const prompt = `Create a personalized starting wedding plan for this couple.

Couple / project: ${project.name}
Wedding date: ${project.wedding_date ?? "not set yet"}
Today: ${todayIso}
Runway: ${runwayMonths !== null ? `${runwayMonths} whole months until the wedding` : "unknown (wedding date not set yet)"}
Location: ${profile?.location ?? "not specified"}
Estimated guests: ${profile?.guest_estimate ?? "not specified"}
Total budget target: ${project.total_budget != null ? `$${project.total_budget}` : "not specified"}
Style & vibe: ${profile?.style ?? "not specified"}
Traditions to honor: ${profile?.traditions ?? "none specified"}
Top priorities: ${profile?.priorities ?? "none specified"}
Formality: ${profile?.formality ?? "not specified"}
Priority vendor categories: ${
  profile?.priority_vendor_category_ids?.length
    ? profile.priority_vendor_category_ids.join(", ")
    : "none specified"
}
Already booked (do not suggest finding a vendor for these): ${
  profile?.already_booked_vendor_category_ids?.length
    ? profile.already_booked_vendor_category_ids.join(", ")
    : "none specified"
}
Anything else: ${profile?.vibe_notes ?? "none"}

Return STRICT JSON ONLY — no prose, no markdown, no code fences — matching exactly this shape:
{
  "checklist": [ { "title": string, "monthsBeforeWedding": number } ],
  "budget": [ { "category": string, "plannedAmount": number } ],
  "vendorCategories": [ { "category": string, "note": string } ]
}`;

console.log("\n=== Anthropic request ===");
console.log({ model, max_tokens: 4096, promptChars: prompt.length });

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
const rawText = await response.text();

console.log("\n=== Anthropic response ===");
console.log({ status: response.status, statusText: response.statusText, elapsedMs });
console.log("headers:", Object.fromEntries(response.headers.entries()));
console.log("body:", rawText.slice(0, 8000));

if (response.ok) {
  try {
    const data = JSON.parse(rawText);
    const text = data.content?.find((b) => b.type === "text")?.text;
    console.log("\n=== Parsed text block (first 2000 chars) ===");
    console.log(text?.slice(0, 2000));
    if (text) {
      const stripped = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      const parsed = JSON.parse(stripped);
      console.log("\n=== JSON parse OK ===");
      console.log({
        checklistLen: parsed.checklist?.length,
        budgetLen: parsed.budget?.length,
        vendorCategoriesLen: parsed.vendorCategories?.length,
      });
    }
  } catch (e) {
    console.error("\n=== Post-response parse failure ===", e);
  }
}
