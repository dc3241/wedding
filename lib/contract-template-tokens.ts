/** Fixed merge-token catalog for contract templates (CON-02). */

export const BLANK_PLACEHOLDER = "__________";

export const CONTRACT_TEMPLATE_TOKENS = [
  { token: "{{couple_name}}", label: "Couple name" },
  { token: "{{wedding_date}}", label: "Wedding date" },
  { token: "{{total_budget}}", label: "Total budget" },
  { token: "{{business_name}}", label: "Business name" },
  { token: "{{today}}", label: "Today" },
  { token: "{{vendor_name}}", label: "Vendor name" },
  { token: "{{vendor_category}}", label: "Vendor category" },
  { token: "{{vendor_contact_name}}", label: "Vendor contact" },
  { token: "{{vendor_email}}", label: "Vendor email" },
  { token: "{{vendor_phone}}", label: "Vendor phone" },
  { token: "{{vendor_address}}", label: "Vendor address" },
  { token: "{{amount}}", label: "Quoted amount" },
] as const;

export type ContractTemplateToken =
  (typeof CONTRACT_TEMPLATE_TOKENS)[number]["token"];

const KNOWN = new Set<string>(
  CONTRACT_TEMPLATE_TOKENS.map((t) => t.token),
);

export function isKnownTemplateToken(token: string): boolean {
  return KNOWN.has(token);
}

/** Replace catalog tokens; unknown `{{...}}` left literal. */
export function applyTemplateTokens(
  body: string,
  values: Record<string, string>,
): string {
  return body.replace(/\{\{[a-z_]+\}\}/g, (match) => {
    if (!KNOWN.has(match)) return match;
    const value = values[match];
    if (value === undefined || value === null || value === "") {
      return BLANK_PLACEHOLDER;
    }
    return value;
  });
}
