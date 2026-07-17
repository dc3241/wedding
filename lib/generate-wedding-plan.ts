import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";
import { monthsBefore } from "@/lib/date-months";
import {
  VENDOR_CATEGORIES,
  getVendorCategoryById,
} from "@/lib/vendor-categories";

export type WeddingProfileInput = {
  projectName: string;
  weddingDate: string | null;
  totalBudget: number | null;
  location: string | null;
  guestEstimate: number | null;
  style: string | null;
  traditions: string | null;
  priorities: string | null;
  vibeNotes: string | null;
};

type RawChecklistItem = {
  title: string;
  monthsBeforeWedding: number;
};

type RawBudgetItem = {
  category: string;
  plannedAmount: number;
};

type RawVendorCategory = {
  category: string;
  note: string;
};

export type RawGeneratedPlan = {
  checklist: RawChecklistItem[];
  budget: RawBudgetItem[];
  vendorCategories: RawVendorCategory[];
};

type ValidatedPlanShape = {
  checklist: RawChecklistItem[];
  budget: RawBudgetItem[];
  vendorCategories: unknown[];
};

function stripJsonFences(raw: string): string {
  return raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateChecklistItem(value: unknown): value is RawChecklistItem {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.title) &&
    isFiniteNumber(value.monthsBeforeWedding) &&
    value.monthsBeforeWedding >= 0
  );
}

function validateBudgetItem(value: unknown): value is RawBudgetItem {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.category) &&
    isFiniteNumber(value.plannedAmount) &&
    value.plannedAmount >= 0
  );
}

/** Keep canonical vendor category entries; drop and log the rest. */
export function filterCanonicalVendorCategories(
  entries: unknown[],
): RawVendorCategory[] {
  const kept: RawVendorCategory[] = [];

  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry.note !== "string") {
      console.log(
        "[generate-wedding-plan] dropping malformed vendorCategories entry",
        entry,
      );
      continue;
    }

    if (!isNonEmptyString(entry.category)) {
      console.log(
        "[generate-wedding-plan] dropping vendorCategories entry with empty category",
        entry,
      );
      continue;
    }

    const id = entry.category.trim();
    if (!getVendorCategoryById(id)) {
      console.log(
        "[generate-wedding-plan] dropping non-canonical vendor category",
        id,
      );
      continue;
    }

    kept.push({ category: id, note: entry.note.trim() });
  }

  if (kept.length === 0) {
    console.log(
      "[generate-wedding-plan] vendorCategories empty after filtering",
    );
  }

  return kept;
}

export function validateGeneratedPlan(
  parsed: unknown,
): parsed is ValidatedPlanShape {
  if (!isRecord(parsed)) return false;
  if (!Array.isArray(parsed.checklist) || parsed.checklist.length === 0) {
    return false;
  }
  if (!Array.isArray(parsed.budget) || parsed.budget.length === 0) {
    return false;
  }
  // vendorCategories: array required; may be empty. Per-entry filtering is separate.
  if (!Array.isArray(parsed.vendorCategories)) {
    return false;
  }

  return (
    parsed.checklist.every(validateChecklistItem) &&
    parsed.budget.every(validateBudgetItem)
  );
}

export function dueDateFromMonthsBefore(
  weddingDate: string,
  monthsBeforeCount: number,
): string {
  return monthsBefore(weddingDate, monthsBeforeCount);
}

function buildPrompt(
  profile: WeddingProfileInput,
  todayIso: string,
  runwayMonths: number | null,
): string {
  const vendorCategoryIds = VENDOR_CATEGORIES.map((c) => c.id).join(", ");

  const runwayBlock =
    runwayMonths !== null
      ? `Today: ${todayIso}
Runway: ${runwayMonths} whole months until the wedding`
      : `Today: ${todayIso}
Runway: unknown (wedding date not set yet)`;

  const runwayGuidance =
    runwayMonths !== null
      ? `- Every monthsBeforeWedding MUST be <= ${runwayMonths}. For a short runway, compress the plan into the available months rather than emitting a 12-month horizon.`
      : `- Wedding date is not set; use reasonable monthsBeforeWedding values (0–12).`;

  return `Create a personalized starting wedding plan for this couple.

Couple / project: ${profile.projectName}
Wedding date: ${profile.weddingDate ?? "not set yet"}
${runwayBlock}
Location: ${profile.location ?? "not specified"}
Estimated guests: ${profile.guestEstimate ?? "not specified"}
Total budget target: ${profile.totalBudget !== null ? `$${profile.totalBudget}` : "not specified"}
Style & vibe: ${profile.style ?? "not specified"}
Traditions to honor: ${profile.traditions ?? "none specified"}
Top priorities: ${profile.priorities ?? "none specified"}
Anything else: ${profile.vibeNotes ?? "none"}

Return STRICT JSON ONLY — no prose, no markdown, no code fences — matching exactly this shape:
{
  "checklist": [ { "title": string, "monthsBeforeWedding": number } ],
  "budget": [ { "category": string, "plannedAmount": number } ],
  "vendorCategories": [ { "category": string, "note": string } ]
}

Guidance:
- Include 10–18 checklist tasks with monthsBeforeWedding as whole months before the wedding (0 for week-of tasks).
${runwayGuidance}
- Budget categories should sum to roughly the couple's total budget target (within about 10% if a target is given).
- Reflect their style, traditions, and priorities in task titles, budget splits, and vendor category notes.
- vendorCategories[].category MUST be exactly one of these ids (no labels, no synonyms): ${vendorCategoryIds}.
- Include essential vendor categories from that id list tailored to their wedding. note stays free text.`;
}

export async function callClaudeForWeddingPlan(
  profile: WeddingProfileInput,
  todayIso: string,
  runwayMonths: number | null,
): Promise<RawGeneratedPlan | null> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return null;

  try {
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
        messages: [
          {
            role: "user",
            content: buildPrompt(profile, todayIso, runwayMonths),
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };

    const raw = data.content?.find((block) => block.type === "text")?.text;
    if (!raw) return null;

    const parsed = JSON.parse(stripJsonFences(raw)) as unknown;
    if (!validateGeneratedPlan(parsed)) return null;

    return {
      checklist: parsed.checklist.map((item) => ({
        title: item.title.trim(),
        monthsBeforeWedding: Math.round(item.monthsBeforeWedding),
      })),
      budget: parsed.budget.map((item) => ({
        category: item.category.trim(),
        plannedAmount: Math.round(item.plannedAmount),
      })),
      vendorCategories: filterCanonicalVendorCategories(parsed.vendorCategories),
    };
  } catch {
    return null;
  }
}
