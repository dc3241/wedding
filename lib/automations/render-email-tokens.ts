import "server-only";

/** Closed list for send_email subject/body. {{amount}} is excluded. */
export const WORKFLOW_EMAIL_TOKENS = [
  "couple_name",
  "account_name",
  "wedding_date",
] as const;

export type WorkflowEmailToken = (typeof WORKFLOW_EMAIL_TOKENS)[number];

export type WorkflowEmailTokenValues = Record<WorkflowEmailToken, string>;

const ALLOWED = new Set<string>(WORKFLOW_EMAIL_TOKENS);

/** Match any {{...}} so unrecognized tokens cannot leak through. */
const TOKEN_RE = /\{\{([^}]*)\}\}/g;

export function formatWorkflowWeddingDate(date: string | null | undefined): string {
  const raw = date?.trim();
  if (!raw) return "";
  const parsed = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Replace allowlisted tokens with values. Unresolved and unrecognized
 * tokens become "" — never leave a raw {{...}} in the result.
 */
export function renderWorkflowEmailTokens(
  template: string,
  values: WorkflowEmailTokenValues,
): string {
  return template.replace(TOKEN_RE, (_match, name: string) => {
    const key = name.trim();
    if (!ALLOWED.has(key)) return "";
    return values[key as WorkflowEmailToken] ?? "";
  });
}
