import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";

const VALID_PHASES = new Set([
  "12+ months",
  "9 months",
  "6 months",
  "3 months",
  "1 month",
  "week of",
]);

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
  phase: string;
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
    isNonEmptyString(value.phase) &&
    VALID_PHASES.has(value.phase.trim()) &&
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

function validateVendorCategory(value: unknown): value is RawVendorCategory {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value.category) &&
    typeof value.note === "string"
  );
}

export function validateGeneratedPlan(parsed: unknown): parsed is RawGeneratedPlan {
  if (!isRecord(parsed)) return false;
  if (!Array.isArray(parsed.checklist) || parsed.checklist.length === 0) {
    return false;
  }
  if (!Array.isArray(parsed.budget) || parsed.budget.length === 0) {
    return false;
  }
  if (
    !Array.isArray(parsed.vendorCategories) ||
    parsed.vendorCategories.length === 0
  ) {
    return false;
  }

  return (
    parsed.checklist.every(validateChecklistItem) &&
    parsed.budget.every(validateBudgetItem) &&
    parsed.vendorCategories.every(validateVendorCategory)
  );
}

export function dueDateFromMonthsBefore(
  weddingDate: string,
  monthsBefore: number,
): string {
  const date = new Date(weddingDate + "T00:00:00");
  date.setMonth(date.getMonth() - monthsBefore);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildPrompt(profile: WeddingProfileInput): string {
  return `Create a personalized starting wedding plan for this couple.

Couple / project: ${profile.projectName}
Wedding date: ${profile.weddingDate ?? "not set yet"}
Location: ${profile.location ?? "not specified"}
Estimated guests: ${profile.guestEstimate ?? "not specified"}
Total budget target: ${profile.totalBudget !== null ? `$${profile.totalBudget}` : "not specified"}
Style & vibe: ${profile.style ?? "not specified"}
Traditions to honor: ${profile.traditions ?? "none specified"}
Top priorities: ${profile.priorities ?? "none specified"}
Anything else: ${profile.vibeNotes ?? "none"}

Return STRICT JSON ONLY — no prose, no markdown, no code fences — matching exactly this shape:
{
  "checklist": [ { "title": string, "phase": string, "monthsBeforeWedding": number } ],
  "budget": [ { "category": string, "plannedAmount": number } ],
  "vendorCategories": [ { "category": string, "note": string } ]
}

Guidance:
- Use phase buckets exactly from: "12+ months", "9 months", "6 months", "3 months", "1 month", "week of".
- Include 10–18 checklist tasks with monthsBeforeWedding as whole months before the wedding (0 for week-of tasks).
- Budget categories should sum to roughly the couple's total budget target (within about 10% if a target is given).
- Reflect their style, traditions, and priorities in task titles, budget splits, and vendor category notes.
- Include essential vendor categories (venue, catering, photography, etc.) tailored to their wedding.`;
}

export async function callClaudeForWeddingPlan(
  profile: WeddingProfileInput,
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
        messages: [{ role: "user", content: buildPrompt(profile) }],
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
        phase: item.phase.trim(),
        monthsBeforeWedding: Math.round(item.monthsBeforeWedding),
      })),
      budget: parsed.budget.map((item) => ({
        category: item.category.trim(),
        plannedAmount: Math.round(item.plannedAmount),
      })),
      vendorCategories: parsed.vendorCategories.map((item) => ({
        category: item.category.trim(),
        note: item.note.trim(),
      })),
    };
  } catch {
    return null;
  }
}
