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
  formality: string | null;
  priorityVendorCategoryIds: string[];
  alreadyBookedVendorCategoryIds: string[];
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
Formality: ${profile.formality ?? "not specified"}
Priority vendor categories: ${
    profile.priorityVendorCategoryIds.length > 0
      ? profile.priorityVendorCategoryIds.join(", ")
      : "none specified"
  }
Already booked (do not suggest finding a vendor for these): ${
    profile.alreadyBookedVendorCategoryIds.length > 0
      ? profile.alreadyBookedVendorCategoryIds.join(", ")
      : "none specified"
  }
Anything else: ${profile.vibeNotes ?? "none"}

Guidance:
- Include 10–18 checklist tasks. monthsBeforeWedding is whole months before the wedding (0 for week-of tasks).
${runwayGuidance}
- Budget categories should sum to roughly the couple's total budget target (within about 10% if a target is given).
- Reflect their style, traditions, and priorities in task titles, budget splits, and vendor category notes.
- If priority vendor categories are specified, allocate a larger budget share and generate earlier/more thorough checklist coverage for those categories specifically. Reflect formality in vendor tone, task framing, and budget tier assumptions.
- For already-booked vendor categories, do NOT generate a checklist task for finding or hiring a vendor in that category, and do NOT include it in vendorCategories — the couple already has this vendor. This applies even if that category is also marked as a priority. DO still include a normal budget line item for that category, since they are still paying for it.
- vendorCategories[].category MUST be exactly one of these ids (no labels, no synonyms): ${vendorCategoryIds}.
- Include essential vendor categories from that id list tailored to their wedding. note stays free text.`;
}

/** Constrained decoding — Anthropic guarantees this JSON, not free-text. */
function weddingPlanJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["checklist", "budget", "vendorCategories"],
    properties: {
      checklist: {
        type: "array",
        minItems: 1,
        description: "10 to 18 starting tasks for this wedding.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "monthsBeforeWedding"],
          properties: {
            title: {
              type: "string",
              description: "Task title. Non-empty.",
            },
            monthsBeforeWedding: {
              type: "integer",
              description:
                "Whole months before the wedding. 0 is week-of. Must not exceed the runway.",
            },
          },
        },
      },
      budget: {
        type: "array",
        minItems: 1,
        description:
          "Budget line items. Amounts should sum to roughly the couple's total budget target.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "plannedAmount"],
          properties: {
            category: {
              type: "string",
              description: "Budget category label (free text).",
            },
            plannedAmount: {
              type: "number",
              description: "Planned dollar amount. Zero or positive.",
            },
          },
        },
      },
      vendorCategories: {
        type: "array",
        description:
          "Vendors still to find. Omit already-booked categories. Empty is allowed.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "note"],
          properties: {
            category: {
              type: "string",
              enum: VENDOR_CATEGORIES.map((c) => c.id),
              description: "Canonical vendor category id.",
            },
            note: {
              type: "string",
              description: "Why this vendor matters for this wedding.",
            },
          },
        },
      },
    },
  };
}

const TRANSIENT_HTTP_STATUSES = new Set([429, 500, 502, 503, 529]);

type AnthropicPlanResponse = {
  stop_reason?: string;
  content?: { type: string; text?: string }[];
};

export async function callClaudeForWeddingPlan(
  profile: WeddingProfileInput,
  todayIso: string,
  runwayMonths: number | null,
): Promise<RawGeneratedPlan | null> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return null;

  // Structured JSON + up to 3 attempts for transient API / truncation only.
  // 3 × ~26s observed ≈ 78s — fits onboarding maxDuration=120.
  const MAX_ATTEMPTS = 3;
  const prompt = buildPrompt(profile, todayIso, runwayMonths);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
          max_tokens: 8192,
          system:
            "You are a wedding planning assistant. Produce a complete starting plan for this couple.",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          output_config: {
            format: {
              type: "json_schema",
              schema: weddingPlanJsonSchema(),
            },
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        console.error("[generate-wedding-plan] Anthropic API error", {
          attempt,
          status: response.status,
          statusText: response.statusText,
          body: errorBody.slice(0, 4000),
        });
        if (
          TRANSIENT_HTTP_STATUSES.has(response.status) &&
          attempt < MAX_ATTEMPTS
        ) {
          continue;
        }
        return null;
      }

      const data = (await response.json()) as AnthropicPlanResponse;

      if (
        data.stop_reason === "max_tokens" ||
        data.stop_reason === "refusal"
      ) {
        console.error("[generate-wedding-plan] incomplete structured output", {
          attempt,
          stop_reason: data.stop_reason,
        });
        if (attempt < MAX_ATTEMPTS) continue;
        return null;
      }

      const raw = data.content?.find((block) => block.type === "text")?.text;
      if (!raw) {
        console.error("[generate-wedding-plan] empty text block", { attempt });
        if (attempt < MAX_ATTEMPTS) continue;
        return null;
      }

      const stripped = stripJsonFences(raw);
      let parsed: unknown;
      try {
        parsed = JSON.parse(stripped);
      } catch (error) {
        if (error instanceof SyntaxError) {
          const match = /position (\d+)/i.exec(error.message);
          const offset = match ? Number(match[1]) : 0;
          console.error("[generate-wedding-plan] JSON.parse failed", {
            attempt,
            maxAttempts: MAX_ATTEMPTS,
            length: stripped.length,
            offset,
            window: stripped.slice(
              Math.max(0, offset - 200),
              offset + 200,
            ),
          });
          if (attempt < MAX_ATTEMPTS) continue;
          return null;
        }
        throw error;
      }

      if (!validateGeneratedPlan(parsed)) {
        console.error(
          "[generate-wedding-plan] model output failed validation",
          { attempt, parsed },
        );
        if (attempt < MAX_ATTEMPTS) continue;
        return null;
      }

      return {
        checklist: parsed.checklist.map((item) => ({
          title: item.title.trim(),
          monthsBeforeWedding: Math.round(item.monthsBeforeWedding),
        })),
        budget: parsed.budget.map((item) => ({
          category: item.category.trim(),
          plannedAmount: Math.round(item.plannedAmount),
        })),
        vendorCategories: filterCanonicalVendorCategories(
          parsed.vendorCategories,
        ),
      };
    } catch (error) {
      console.error("[generate-wedding-plan] Anthropic call failed", {
        attempt,
        error,
      });
      if (attempt < MAX_ATTEMPTS) continue;
      return null;
    }
  }

  return null;
}
