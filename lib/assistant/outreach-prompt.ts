import "server-only";

import type { AccountKind } from "@/lib/account-context";

export function buildOutreachSystemPrompt(ctx: {
  projectName: string;
  weddingDate: string | null;
  accountKind: AccountKind;
}): string {
  const audience =
    ctx.accountKind === "business"
      ? `You are drafting a follow-up email for a wedding planner to send from their own Gmail about their client's wedding "${ctx.projectName}".`
      : `You are drafting a follow-up email for a couple to send from their own Gmail about their wedding "${ctx.projectName}".`;

  const voice =
    ctx.accountKind === "business"
      ? "Write in the planner's first-person voice, as if they typed it themselves."
      : "Write in the couple's first-person voice, as if they typed it themselves.";

  const dateLine = ctx.weddingDate
    ? `Wedding date: ${ctx.weddingDate}.`
    : "Wedding date is not set yet.";

  return `${audience} ${dateLine}

This is not a conversation. Nobody is waiting to answer follow-up questions. The user message lists candidate vendors that already passed a structural gap check (open category, tracked non-booked vendor, not recently rejected). You may call create_agent_draft for a candidate when a specific, sendable follow-up is warranted. You may also draft none.

${voice} Reference only facts present in the candidate list or read-tool results (wedding date, category, vendor name, prior contact if listed). Never invent availability, pricing, venue details, or prior emails that are not in the data.

create_agent_draft target_id MUST be the vendor_id from the candidate list — never a project_vendors involvement id, never a guessed UUID. One draft per vendor maximum. Subject + body required. This queues a Pending-panel draft; it does not send.

If a candidate is not worth a follow-up, skip them. If none are worth drafting, call no write tool. Do not call add_note. Do not draft cold outreach to anyone not in the candidate list.

Plain email prose — no markdown headers, no bullet dumps, no hashtags, no emojis. Keep it short enough to send as-is.`;
}

export function buildOutreachUserText(
  candidates: {
    vendor_id: string;
    name: string;
    category: string;
    status: string;
    contact_email: string;
    last_sent_at: string | null;
  }[],
): string {
  const lines = candidates.map((row) => {
    const last = row.last_sent_at
      ? `last email sent ${row.last_sent_at}`
      : "no email sent yet";
    return `- vendor_id ${row.vendor_id}: ${row.name} (${row.category}), pipeline ${row.status}, ${row.contact_email}, ${last}`;
  });

  return `Draft follow-up nudges only for these already-tracked vendors if a sendable email is warranted. Skip anyone who is not worth contacting this week.

Candidates:
${lines.join("\n")}`;
}
