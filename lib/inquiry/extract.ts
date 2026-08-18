import "server-only";

import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";

export type InquiryExtraction = {
  wedding_date: string | null;
  guest_count: number | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!DATE_RE.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

function parseGuestCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > 20000) return null;
  return value;
}

export async function extractInquiryFacts(input: {
  coupleName: string;
  notes: string | null;
}): Promise<InquiryExtraction | null> {
  const notes = input.notes?.trim() || "";
  if (!notes) {
    return { wedding_date: null, guest_count: null };
  }

  const parsed = await callClaudeJson({
    system:
      "You extract structured facts from a wedding inquiry email. Respond with STRICT JSON ONLY — no prose, no markdown, no code fences. Never guess. If a fact is not explicitly stated, return null for it.",
    user: `Extract wedding date and guest count from this inquiry. Only use values the sender explicitly stated. Do not infer from season, venue, or typical wedding sizes.

From name: ${input.coupleName}

Raw email:
${notes}

Return exactly:
{
  "wedding_date": "YYYY-MM-DD" | null,
  "guest_count": number | null
}`,
    maxTokens: 256,
  });

  if (!isRecord(parsed)) return null;

  return {
    wedding_date: parseDate(parsed.wedding_date),
    guest_count: parseGuestCount(parsed.guest_count),
  };
}
