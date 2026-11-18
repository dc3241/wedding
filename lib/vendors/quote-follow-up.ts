import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAgentDraft } from "@/lib/assistant/create-agent-draft";
import type { ExtractedQuote } from "@/lib/vendors/quote-extract";
import { isDateOnlyProjectName } from "@/lib/wedding-date";

/**
 * QUOTE-FOLLOWUP-01 — after a vendor replies, queue a short reply in Pending.
 * Templated on purpose: no model call, so nothing is invented. Questions the
 * vendor asked become [your answer] blanks the couple fills in before sending.
 * Never sends; the couple approves it like any other draft.
 */

function signoff(projectName: string): string {
  if (isDateOnlyProjectName(projectName.trim())) return "Thank you!";
  const cleaned = projectName
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\s,–-]+$/, "")
    .trim();
  if (!cleaned || /^\d/.test(cleaned) || /wedding$/i.test(cleaned)) return "Thank you!";
  return `Thank you!\n${cleaned}`;
}

export function buildQuoteFollowUp(input: {
  vendorName: string;
  projectName: string;
  subject: string;
  quote: ExtractedQuote;
}): { subject: string; body: string } | null {
  const { quote } = input;
  const subject = /^re:/i.test(input.subject.trim())
    ? input.subject.trim()
    : `Re: ${input.subject.trim()}`;
  const greeting = `Hi ${input.vendorName} team,`;

  if (quote.availability === "unavailable") {
    return {
      subject,
      body: `${greeting}\n\nThanks so much for getting back to us, and sorry to hear our date is already taken. We appreciate your time and wish you a great season.\n\n${signoff(input.projectName)}`,
    };
  }

  if (quote.availability !== "available" && quote.price === null) return null;

  const answers =
    quote.questionsForCouple.length > 0
      ? `To answer your questions:\n${quote.questionsForCouple
          .map((q) => `- ${q}\n  [your answer]`)
          .join("\n")}\n\n`
      : "";

  return {
    subject,
    body: `${greeting}\n\nThank you for the details! ${answers}We'd love to take the next step. Could you share a few times that work for a quick call or a visit?\n\n${signoff(input.projectName)}`,
  };
}

export async function queueQuoteFollowUp(
  client: SupabaseClient,
  input: {
    projectId: string;
    vendorId: string;
    vendorName: string;
    projectName: string;
    subject: string;
    quote: ExtractedQuote;
  },
): Promise<"queued" | "skipped" | "failed"> {
  const draft = buildQuoteFollowUp(input);
  if (!draft) return "skipped";
  const result = await createAgentDraft(
    input.projectId,
    { targetId: input.vendorId, subject: draft.subject, body: draft.body },
    client,
  );
  // A pending draft for this vendor already exists → leave it alone.
  return result.ok ? "queued" : "failed";
}
