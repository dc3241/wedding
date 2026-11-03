import "server-only";

import type { Resend } from "resend";
import { resolveAccountEmails } from "@/lib/cron/resolve-account-emails";
import { getAccountAssistantAccess, recordAssistantUsage } from "@/lib/billing/assistant-access";
import { sendEmail } from "@/lib/email/send";
import { parseFromHeader } from "@/lib/inquiry/parse";
import type { VendorQuotePayload } from "@/lib/assistant/proposals";
import { extractQuote } from "@/lib/vendors/quote-extract";
import { vendorTokenFromRecipients } from "@/lib/vendors/reply-address";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/**
 * AGENTIC-03 — a vendor replied to an outreach email we sent with a
 * First Look Reply-To. Log it, forward it to the couple, and (if their
 * assistant plan allows) extract the quote into a proposal for approval.
 * Called from the Resend inbound webhook BEFORE inquiry-slug routing.
 *
 * Returns null when no recipient is a vendor reply address, so the webhook
 * falls through to its other paths.
 */

type InboundEvent = {
  data: {
    email_id: string;
    from: string;
    subject: string;
    to?: string[];
    received_for?: string[];
  };
};

const MAX_STORED_BODY = 8000;

/** Drop the quoted thread so we store and parse only the new message. */
export function stripQuotedReply(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (/^On .{5,120} wrote:\s*$/i.test(line.trim())) break;
    if (/^-{2,}\s*(original message|forwarded message)/i.test(line.trim())) break;
    if (/^From:\s.+/i.test(line) && out.length > 3) break;
    if (line.trim().startsWith(">")) continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type PvRow = {
  id: string;
  project_id: string;
  vendors: { name: string; category: string | null } | { name: string; category: string | null }[] | null;
  projects: { account_id: string; name: string } | { account_id: string; name: string }[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function handleVendorReply(
  event: InboundEvent,
  resend: Resend,
  inboundDomain: string,
): Promise<{ handled: false } | { handled: true; result: string }> {
  const recipients = [
    ...(event.data.to ?? []),
    ...(event.data.received_for ?? []),
  ];
  const token = vendorTokenFromRecipients(recipients, inboundDomain);
  if (!token) return { handled: false };

  const admin = createServiceRoleClient();
  const emailId = event.data.email_id;

  const { data: pvRaw } = await admin
    .from("project_vendors")
    .select(
      "id, project_id, vendors ( name, category ), projects ( account_id, name )",
    )
    .eq("confirm_token", token)
    .maybeSingle();
  const pv = pvRaw as PvRow | null;
  const vendor = pv ? one(pv.vendors) : null;
  const project = pv ? one(pv.projects) : null;
  if (!pv || !vendor || !project) {
    return { handled: true, result: "unknown_token" };
  }

  if (emailId) {
    const { data: existing } = await admin
      .from("outreach_messages")
      .select("id")
      .eq("inbound_email_id", emailId)
      .maybeSingle();
    if (existing) return { handled: true, result: "duplicate" };
  }

  let bodyText = "";
  if (emailId) {
    try {
      const { data: received } = await resend.emails.receiving.get(emailId);
      bodyText = (received?.text || "").trim();
    } catch (err) {
      console.error("vendor-reply: receiving.get", err);
    }
  }
  const fresh = stripQuotedReply(bodyText).slice(0, MAX_STORED_BODY);
  const subject = event.data.subject.trim() || "(no subject)";
  const from = parseFromHeader(event.data.from);

  const { data: message, error: insertError } = await admin
    .from("outreach_messages")
    .insert({
      project_vendor_id: pv.id,
      direction: "inbound",
      channel: "email",
      subject,
      body: fresh || "(Body could not be retrieved.)",
      status: "sent",
      sent_at: new Date().toISOString(),
      inbound_email_id: emailId || null,
    })
    .select("id")
    .single();
  if (insertError || !message) {
    console.error("vendor-reply: insert", insertError?.message);
    return { handled: true, result: "insert_failed" };
  }

  // Forward so the couple still sees the reply in their own inbox.
  try {
    const emails = (
      await resolveAccountEmails(admin, [project.account_id])
    ).get(project.account_id);
    if (emails && emails.length > 0) {
      const note = `${vendor.name} replied about ${project.name}. You can answer them directly from this email.`;
      await sendEmail({
        to: emails,
        subject: `Reply from ${vendor.name}: ${subject}`,
        text: `${note}\n\n${fresh || bodyText}`,
        html: `<p>${escapeHtml(note)}</p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(
          fresh || bodyText,
        )}</pre>`,
        ...(from.email ? { replyTo: from.email } : {}),
      });
    }
  } catch (err) {
    console.error("vendor-reply: forward failed", err);
  }

  // Quote extraction only for accounts whose assistant plan allows it.
  if (!fresh) return { handled: true, result: "logged" };
  try {
    const access = await getAccountAssistantAccess(admin, project.account_id);
    if (!access.allowed) return { handled: true, result: "logged_no_access" };

    const extraction = await extractQuote({
      vendorName: vendor.name,
      category: vendor.category,
      subject,
      body: fresh,
    });
    await recordAssistantUsage({
      accountId: project.account_id,
      projectId: pv.project_id,
      source: "quote_extraction",
      usage: extraction.usage,
      model: extraction.ok ? extraction.model : undefined,
    });
    if (!extraction.ok) return { handled: true, result: "extract_failed" };

    const q = extraction.quote;
    const useful =
      q.isReply &&
      (q.price !== null || q.availability !== "unclear" || q.inclusions.length > 0);
    if (!useful) return { handled: true, result: "logged_no_quote" };

    // A newer reply supersedes any older pending quote for this vendor.
    await admin
      .from("assistant_proposals")
      .update({ status: "rejected", resolved_at: new Date().toISOString() })
      .eq("project_id", pv.project_id)
      .eq("kind", "vendor_quote")
      .eq("status", "pending")
      .filter("payload->>projectVendorId", "eq", pv.id);

    const payload: VendorQuotePayload = {
      projectVendorId: pv.id,
      vendorName: vendor.name,
      outreachMessageId: message.id,
      quote: {
        availability: q.availability,
        price: q.price,
        priceBasis: q.priceBasis,
        deposit: q.deposit,
        inclusions: q.inclusions,
        conditions: q.conditions,
        questionsForCouple: q.questionsForCouple,
        summary: q.summary,
      },
    };
    const { error: proposalError } = await admin.from("assistant_proposals").insert({
      account_id: project.account_id,
      project_id: pv.project_id,
      kind: "vendor_quote",
      title: `${vendor.name} replied`,
      summary: q.summary || null,
      payload,
      status: "pending",
    });
    if (proposalError) {
      console.error("vendor-reply: proposal insert", proposalError.message);
      return { handled: true, result: "proposal_failed" };
    }
  } catch (err) {
    console.error("vendor-reply: extraction", err);
    return { handled: true, result: "extract_failed" };
  }

  return { handled: true, result: "quote_proposed" };
}
