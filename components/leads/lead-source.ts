/**
 * Source stays free text on `leads.source` (inquiry form writes `form`,
 * inbound email writes `email_inbound`). This list is the writer and the
 * display map. Unknown stored values are kept, not rewritten.
 */

export const LEAD_SOURCES = [
  { value: "referral", label: "Referral", manual: true },
  { value: "instagram", label: "Instagram", manual: true },
  { value: "the_knot", label: "The Knot", manual: true },
  { value: "weddingwire", label: "WeddingWire", manual: true },
  { value: "website", label: "Website", manual: true },
  { value: "other", label: "Other", manual: true },
  { value: "form", label: "Inquiry form", manual: false },
  { value: "email_inbound", label: "Email", manual: false },
] as const;

export type LeadSourceValue = (typeof LEAD_SOURCES)[number]["value"];

const ALIASES: Record<string, LeadSourceValue> = {
  referral: "referral",
  instagram: "instagram",
  "the knot": "the_knot",
  theknot: "the_knot",
  the_knot: "the_knot",
  weddingwire: "weddingwire",
  "wedding wire": "weddingwire",
  website: "website",
  other: "other",
  form: "form",
  email_inbound: "email_inbound",
  email: "email_inbound",
};

export function canonicalLeadSource(
  value: string | null | undefined,
): LeadSourceValue | null {
  if (!value) return null;
  return ALIASES[value.trim().toLowerCase()] ?? null;
}

export function leadSourceLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const key = canonicalLeadSource(trimmed);
  if (!key) return trimmed;
  return LEAD_SOURCES.find((option) => option.value === key)?.label ?? trimmed;
}

export function parseManualLeadSource(
  value: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return { ok: true, value: null };
  const key = canonicalLeadSource(trimmed);
  const option = LEAD_SOURCES.find((entry) => entry.value === key);
  if (!option?.manual) {
    return { ok: false, error: "Choose a source from the list." };
  }
  return { ok: true, value: option.value };
}

/** Edit may resubmit a system source or an unknown string already stored. */
export function parseEditableLeadSource(
  next: string | null | undefined,
  current: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const trimmed = next?.trim() ?? "";
  if (!trimmed) return { ok: true, value: null };
  const key = canonicalLeadSource(trimmed);
  if (key) return { ok: true, value: key };
  const existing = current?.trim() ?? "";
  if (existing && existing === trimmed) {
    return { ok: true, value: existing };
  }
  return { ok: false, error: "Choose a source from the list." };
}
