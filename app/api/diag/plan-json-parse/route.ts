/**
 * TEMPORARY diagnostic — preview only. Remove after capturing the
 * malformed JSON window for plan generation. Not a product route.
 */
import { NextResponse } from "next/server";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** One-shot recon gate — not a long-lived secret. */
const DIAG_TOKEN = "recon-parse-2026-08-27-a7f3";

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

const FIXTURE_PROMPT = `Create a personalized starting wedding plan for this couple.

Couple / project: Repro couple
Wedding date: 2026-12-15
Today: 2026-08-27
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

Return STRICT JSON ONLY — no prose, no markdown, no code fences — matching exactly this shape:
{
  "checklist": [ { "title": string, "monthsBeforeWedding": number } ],
  "budget": [ { "category": string, "plannedAmount": number } ],
  "vendorCategories": [ { "category": string, "note": string } ]
}

Guidance:
- Include 10–18 checklist tasks with monthsBeforeWedding as whole months before the wedding (0 for week-of tasks).
- Every monthsBeforeWedding MUST be <= 3. For a short runway, compress the plan into the available months rather than emitting a 12-month horizon.
- Budget categories should sum to roughly the couple's total budget target (within about 10% if a target is given).
- Reflect their style, traditions, and priorities in task titles, budget splits, and vendor category notes.
- For already-booked vendor categories, do NOT generate a checklist task for finding or hiring a vendor in that category, and do NOT include it in vendorCategories — the couple already has this vendor. This applies even if that category is also marked as a priority. DO still include a normal budget line item for that category, since they are still paying for it.
- vendorCategories[].category MUST be exactly one of these ids (no labels, no synonyms): venue, caterer, florist, baker, hair-makeup, jewelry, photographer, videographer, dj, band, officiant, planner, rentals.
- Include essential vendor categories from that id list tailored to their wedding. note stays free text.`;

async function oneAttempt(): Promise<{
  ok: boolean;
  kind: string;
  elapsedMs: number;
  length?: number;
  offset?: number;
  window?: string;
  status?: number;
  error?: string;
}> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) {
    return { ok: false, kind: "no_key", elapsedMs: 0 };
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
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system:
        "You are a wedding planning assistant. Respond with STRICT JSON ONLY — no prose, no markdown, no code fences.",
      messages: [{ role: "user", content: FIXTURE_PROMPT }],
    }),
  });

  const elapsedMs = Date.now() - started;
  if (!response.ok) {
    return {
      ok: false,
      kind: "http",
      status: response.status,
      elapsedMs,
      error: (await response.text()).slice(0, 300),
    };
  }

  const data = (await response.json()) as {
    content?: { type: string; text?: string }[];
  };
  const raw = data.content?.find((b) => b.type === "text")?.text;
  if (!raw) {
    return { ok: false, kind: "no_text", elapsedMs };
  }

  const stripped = stripJsonFences(raw);
  try {
    JSON.parse(stripped);
    return { ok: true, kind: "ok", elapsedMs, length: stripped.length };
  } catch (error) {
    if (error instanceof SyntaxError) {
      const match = /position (\d+)/i.exec(error.message);
      const offset = match ? Number(match[1]) : 0;
      const window = stripped.slice(Math.max(0, offset - 200), offset + 200);
      console.error("[diag/plan-json-parse] JSON.parse failed", {
        length: stripped.length,
        offset,
        window,
      });
      return {
        ok: false,
        kind: "json_parse",
        elapsedMs,
        length: stripped.length,
        offset,
        window,
        error: error.message,
      };
    }
    throw error;
  }
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("token") !== DIAG_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const attempts = Math.min(
    5,
    Math.max(1, Number(url.searchParams.get("attempts") ?? 5) || 5),
  );

  const results = [];
  for (let i = 1; i <= attempts; i++) {
    const result = await oneAttempt();
    results.push({ n: i, ...result });
    if (result.kind === "json_parse") {
      return NextResponse.json({
        captured: true,
        attemptsRun: i,
        failure: result,
        results,
      });
    }
  }

  return NextResponse.json({
    captured: false,
    attemptsRun: attempts,
    results,
  });
}
