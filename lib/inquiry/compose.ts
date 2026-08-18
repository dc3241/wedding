import "server-only";

import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";

export type InquiryComposeInput = {
  accountName: string;
  brandName: string | null;
  accountKind: "personal" | "business";
  plan: "planner" | "venue";
  coupleName: string;
  contactEmail: string | null;
  weddingDate: string | null;
  guestCount: number | null;
  notes: string | null;
  dateConflictProjectName: string | null;
};

export type InquiryComposeResult =
  | { genuine: false }
  | { genuine: true; subject: string; body: string };

export async function composeInquiryReply(
  input: InquiryComposeInput,
): Promise<InquiryComposeResult | null> {
  const voice =
    input.plan === "venue"
      ? `You are writing as ${input.brandName?.trim() || input.accountName}, a wedding venue, in first person plural or the venue's own voice.`
      : `You are writing as ${input.brandName?.trim() || input.accountName}, a wedding planner, in first person as if you typed this yourself.`;

  const facts = [
    `Inquirer name: ${input.coupleName}`,
    input.contactEmail ? `Inquirer email: ${input.contactEmail}` : "Inquirer email: not on file",
    input.weddingDate
      ? `Stated wedding date: ${input.weddingDate}`
      : "Stated wedding date: none",
    input.guestCount != null
      ? `Stated guest count: ${input.guestCount}`
      : "Stated guest count: none",
    input.dateConflictProjectName
      ? `DATE CONFLICT: this account already has an active wedding on that exact date (${input.dateConflictProjectName}). Mention that unavailability honestly. Do not imply the date is open.`
      : "No date conflict with existing active weddings on this account.",
    `Inquiry notes / raw email:\n${input.notes?.trim() || "(empty)"}`,
  ];

  const parsed = await callClaudeJson({
    system: `${voice}

This is a reply to a wedding inquiry. Respond with STRICT JSON ONLY — no prose wrapping, no markdown, no code fences.

Hard rules:
- If this is not a genuine wedding inquiry (spam, garbage, unrelated, automated junk), set genuine to false and leave subject and body null. Skipping spam is correct.
- Never mention First Look, this app, an assistant, AI, or any internal product language.
- There is no pricing guide and no booking / consultation link. Do not invent one, do not say "here's our pricing," do not ask them to click a scheduling link.
- Do not invent dates, guest counts, venues, packages, or availability that are not in the facts below.
- If a date or guest count is missing, write a warm reply that does not fabricate those specifics.
- Write as the account owner, ready to send from their own Gmail.

Return exactly:
{
  "genuine": boolean,
  "subject": string | null,
  "body": string | null
}`,
    user: `Draft a short inquiry reply from these facts:\n\n${facts.join("\n")}`,
    maxTokens: 1024,
  });

  if (!isRecord(parsed)) return null;
  if (parsed.genuine !== true) {
    return { genuine: false };
  }

  const subject =
    typeof parsed.subject === "string" ? parsed.subject.trim() : "";
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
  if (!subject || !body) return { genuine: false };

  return { genuine: true, subject, body };
}
