/**
 * Checkpoint: verify loadPlan error-state machine and callClaudeForWeddingPlan timing.
 * Run: node scripts/checkpoint-plan-preview.mjs
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const GEN_ERROR =
  "We couldn't generate your plan right now. Please try again in a moment.";

/** Mirrors plan-preview-step loadPlan terminal states after our try/catch fix. */
function simulateLoadPlanOutcome(awaited) {
  let plan = null;
  let genError = null;
  let genLoading = true;
  let hasLoaded = false;

  try {
    if (awaited instanceof Error) throw awaited;
    const result = awaited;
    genLoading = false;
    hasLoaded = true;
    if (result.ok) {
      plan = result.plan;
    } else {
      genError = result.error;
    }
  } catch {
    genLoading = false;
    hasLoaded = true;
    genError = GEN_ERROR;
  }

  const blankCard =
    !genLoading && !genError && !plan && hasLoaded;
  return { plan, genError, genLoading, hasLoaded, blankCard };
}

console.log("=== loadPlan state machine ===");
for (const [label, input] of [
  ["ok:false (LLM null path)", { ok: false, error: GEN_ERROR }],
  ["thrown timeout/rejection", new Error("Server Action timeout")],
  [
    "ok:true",
    { ok: true, plan: { checklist: [{}], budget: [], vendorCategories: [] } },
  ],
]) {
  const syncState =
    input instanceof Error
      ? simulateLoadPlanOutcome(input)
      : simulateLoadPlanOutcome(input);
  console.log(label, syncState);
}

const manifest = JSON.parse(
  readFileSync(
    resolve(__dirname, "../.next/server/functions-config-manifest.json"),
    "utf8",
  ),
);
const onboardingEntry = Object.entries(manifest.functions ?? {}).find(([k]) =>
  k.includes("onboarding"),
);
console.log("\n=== Build manifest maxDuration ===");
console.log(onboardingEntry ?? "onboarding route not found in manifest");

const apiKey = process.env.MODEL_API_KEY;
if (!apiKey) {
  console.log("\n=== Anthropic live call skipped (no MODEL_API_KEY) ===");
  process.exit(0);
}

const started = Date.now();
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 4096,
    system:
      "You are a wedding planning assistant. Respond with STRICT JSON ONLY — no prose, no markdown, no code fences.",
    messages: [
      {
        role: "user",
        content: `Create a personalized starting wedding plan. Formality: black-tie. Style: Black & White. Already booked: venue. Return JSON with checklist, budget, vendorCategories arrays.`,
      },
    ],
  }),
});
const elapsedMs = Date.now() - started;
const body = await response.text();
console.log("\n=== Anthropic live call ===");
console.log({
  status: response.status,
  elapsedMs,
  within120sWindow: elapsedMs < 120_000,
  bodyPreview: body.slice(0, 200),
});
