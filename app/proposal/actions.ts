"use server";

import { revalidatePath } from "next/cache";
import { advanceLeadStageIfEligible } from "@/lib/automations/advance-lead-stage";
import { dispatchLeadAutomation } from "@/lib/automations/run";
import { sendEmailBestEffort } from "@/lib/email/send-best-effort";
import { convertAcceptedProposal } from "@/lib/proposals/convert";
import { parseProposalLineItems } from "@/components/proposals/types";
import { invoicePublicUrl } from "@/lib/invoices/url";
import { proposalPublicUrl } from "@/lib/proposals/url";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { createClient } from "@/utils/supabase/server";

export type PublicProposalRespondResult =
  | {
      ok: true;
      status: "accepted" | "declined";
      invoicePublicUrl?: string | null;
      convertError?: string | null;
    }
  | { ok: false; error: string };

export type SendProposalResult =
  | { ok: true; emailSent: boolean; publicUrl: string }
  | { ok: false; error: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hasBillableLineItems(lineItems: unknown): boolean {
  return parseProposalLineItems(lineItems).some(
    (item) => item.quantity > 0 && item.description.trim(),
  );
}

/**
 * Public Accept / Decline. Accept marks accepted, fires automations, then
 * converts to project + invoice. Convert failure still keeps accepted.
 */
export async function respondToPublicProposal(
  token: string,
  decision: "accept" | "decline",
): Promise<PublicProposalRespondResult> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, error: "This proposal link isn't valid." };
  }

  const admin = createServiceRoleClient();
  const { data: proposal, error } = await admin
    .from("proposals")
    .select(
      "id, account_id, lead_id, status, line_items, access_token",
    )
    .eq("access_token", trimmed)
    .maybeSingle();

  if (error || !proposal) {
    return { ok: false, error: "This proposal link isn't valid." };
  }

  if (proposal.status === "draft") {
    return { ok: false, error: "This proposal isn't ready yet." };
  }

  if (decision === "decline") {
    if (proposal.status === "accepted") {
      return { ok: false, error: "This proposal was already accepted." };
    }
    if (proposal.status !== "declined") {
      const { error: updateError } = await admin
        .from("proposals")
        .update({
          status: "declined",
          accepted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", proposal.id);
      if (updateError) {
        return { ok: false, error: updateError.message };
      }
      await dispatchLeadAutomation({
        accountId: proposal.account_id,
        leadId: proposal.lead_id,
        triggerKind: "proposal_status_changed",
        toStatus: "declined",
      });
      revalidatePath(`/leads/${proposal.lead_id}`);
      revalidatePath("/leads");
    }
    return { ok: true, status: "declined" };
  }

  // accept
  if (proposal.status === "declined") {
    return { ok: false, error: "This proposal was declined." };
  }

  if (!hasBillableLineItems(proposal.line_items)) {
    return {
      ok: false,
      error: "This proposal isn't ready to accept yet. Ask your planner.",
    };
  }

  if (proposal.status !== "accepted") {
    const { error: updateError } = await admin
      .from("proposals")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposal.id);
    if (updateError) {
      return { ok: false, error: updateError.message };
    }
    await dispatchLeadAutomation({
      accountId: proposal.account_id,
      leadId: proposal.lead_id,
      triggerKind: "proposal_status_changed",
      toStatus: "accepted",
    });
  }

  const converted = await convertAcceptedProposal(proposal.id, admin);
  revalidatePath(`/leads/${proposal.lead_id}`);
  revalidatePath("/leads");

  if (!converted.ok) {
    return {
      ok: true,
      status: "accepted",
      convertError: converted.error,
      invoicePublicUrl: null,
    };
  }

  return {
    ok: true,
    status: "accepted",
    invoicePublicUrl: converted.invoiceAccessToken
      ? invoicePublicUrl(converted.invoiceAccessToken)
      : null,
    convertError: null,
  };
}

/**
 * Email the public proposal link and move status to Sent when still Draft.
 */
export async function sendProposal(
  proposalId: string,
): Promise<SendProposalResult> {
  const supabase = await createClient();
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select(
      "id, account_id, lead_id, status, title, line_items, access_token, leads!inner(couple_name, contact_email)",
    )
    .eq("id", proposalId)
    .maybeSingle();

  if (error || !proposal) {
    return { ok: false, error: error?.message ?? "Proposal not found." };
  }

  if (!hasBillableLineItems(proposal.line_items)) {
    return { ok: false, error: "Add line items before sending." };
  }

  if (proposal.status === "accepted" || proposal.status === "declined") {
    return {
      ok: false,
      error: "This proposal is already closed.",
    };
  }

  const lead = Array.isArray(proposal.leads) ? proposal.leads[0] : proposal.leads;
  const email =
    lead && typeof lead === "object" && typeof lead.contact_email === "string"
      ? lead.contact_email.trim()
      : "";
  if (!email) {
    return { ok: false, error: "Add a contact email on the lead first." };
  }

  const coupleName =
    lead && typeof lead === "object" && typeof lead.couple_name === "string"
      ? lead.couple_name.trim() || "there"
      : "there";

  if (proposal.status === "draft") {
    const { error: statusError } = await supabase
      .from("proposals")
      .update({
        status: "sent",
        accepted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", proposal.id);
    if (statusError) {
      return { ok: false, error: statusError.message };
    }

    await advanceLeadStageIfEligible(supabase, {
      leadId: proposal.lead_id,
      accountId: proposal.account_id,
      toStage: "proposal",
      fromStages: ["inquiry", "contacted"],
    });

    await dispatchLeadAutomation({
      accountId: proposal.account_id,
      leadId: proposal.lead_id,
      triggerKind: "proposal_status_changed",
      toStatus: "sent",
    });
  }

  const publicUrl = proposalPublicUrl(proposal.access_token);
  const title =
    typeof proposal.title === "string" && proposal.title.trim()
      ? proposal.title.trim()
      : "Proposal";
  const subject = `Your proposal: ${title}`;
  const text = [
    `Hi ${coupleName},`,
    "",
    `Here's your proposal to review.`,
    "",
    `View and respond: ${publicUrl}`,
    "",
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(coupleName)},</p>`,
    `<p>Here's your proposal to review.</p>`,
    `<p><a href="${escapeHtml(publicUrl)}">View and respond</a></p>`,
  ].join("");

  const emailSent = await sendEmailBestEffort(
    { to: email, subject, text, html },
    "sendProposal",
  );

  revalidatePath(`/leads/${proposal.lead_id}`);
  revalidatePath("/leads");

  return { ok: true, emailSent, publicUrl };
}
