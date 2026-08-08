import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";
import { getVendorCategoryById } from "@/lib/vendor-categories";

/** Generator allowlist — fill catalog minus {{amount}} (product decision). */
export const GENERATOR_ALLOWED_TOKENS = [
  "{{couple_name}}",
  "{{wedding_date}}",
  "{{total_budget}}",
  "{{business_name}}",
  "{{today}}",
  "{{vendor_name}}",
  "{{vendor_category}}",
  "{{vendor_contact_name}}",
  "{{vendor_email}}",
  "{{vendor_phone}}",
  "{{vendor_address}}",
] as const;

const ALLOWED = new Set<string>(GENERATOR_ALLOWED_TOKENS);

export type ContractTemplateDraftInput = {
  vendorCategory?: string;
  paymentStructure: string;
  cancellationWindow: string;
  notes?: string;
};

export type GeneratedContractTemplateDraft = {
  name: string;
  body: string;
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

export function validateGeneratedContractTemplate(
  parsed: unknown,
): parsed is GeneratedContractTemplateDraft {
  if (!isRecord(parsed)) return false;
  return isNonEmptyString(parsed.name) && isNonEmptyString(parsed.body);
}

/** True when every {{snake_case}} token in body is in the generator allowlist. */
export function bodyUsesOnlyAllowedTokens(body: string): boolean {
  const matches = body.match(/\{\{[a-z_]+\}\}/g);
  if (!matches) return true;
  return matches.every((token) => ALLOWED.has(token));
}

function buildPrompt(input: ContractTemplateDraftInput): string {
  const categoryId = input.vendorCategory?.trim() || "";
  const category = categoryId ? getVendorCategoryById(categoryId) : undefined;

  const tokenList = GENERATOR_ALLOWED_TOKENS.join(", ");
  const notes = input.notes?.trim() || "none";

  return `Draft a reusable wedding-planner vendor contract template.

Vendor category focus: ${category ? `${category.label} (${category.id})` : "General (no specific category)"}
Payment structure: ${input.paymentStructure.trim()}
Cancellation window: ${input.cancellationWindow.trim()}
Tone / extra clauses: ${notes}

Return STRICT JSON ONLY — no prose, no markdown, no code fences — matching exactly this shape:
{
  "name": string,
  "body": string
}

Guidance:
- name is a short template title a planner would recognize (e.g. "Photographer Agreement").
- body is plain text (not HTML or markdown). Use clear sections and plain paragraphs.
- Use merge tokens ONLY from this closed list, exactly in {{snake_case}} form: ${tokenList}
- NEVER emit {{amount}} or any token outside that list.
- Prefer relevant tokens from the list (party names, wedding date, business, vendor contact fields) where natural; do not invent new placeholders.
- Reflect the payment structure and cancellation window in the body as written terms (not as new tokens).
- Keep the tone professional and suitable for a wedding planner sending to a vendor.`;
}

export async function callClaudeForContractTemplate(
  input: ContractTemplateDraftInput,
): Promise<GeneratedContractTemplateDraft | null> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return null;

  const paymentStructure = input.paymentStructure.trim();
  const cancellationWindow = input.cancellationWindow.trim();
  if (!paymentStructure || !cancellationWindow) return null;

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
        max_tokens: 2048,
        system:
          "You are a wedding planning assistant drafting reusable contract templates. Respond with STRICT JSON ONLY — no prose, no markdown, no code fences. Use only the allowed {{snake_case}} merge tokens listed in the user message. Never emit {{amount}} or any other token.",
        messages: [
          {
            role: "user",
            content: buildPrompt(input),
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
    if (!validateGeneratedContractTemplate(parsed)) return null;

    const name = parsed.name.trim();
    const body = parsed.body.trim();
    if (!name || !body) return null;

    if (!bodyUsesOnlyAllowedTokens(body)) return null;

    return { name, body };
  } catch {
    return null;
  }
}
