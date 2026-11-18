import { sendEmail } from "@/lib/email/send";
import { getGmailAccessForSend } from "@/lib/gmail-credentials";
import { sendGmailMessage } from "@/lib/gmail-send";
import { vendorReplyAddress } from "@/lib/vendors/reply-address";
import { isDateOnlyProjectName } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

type SendOutcome =
  | { ok: true }
  | { ok: false; error: string; needsConnect?: boolean };

type VendorEmbed = {
  contact_email: string | null;
  name: string;
};

type PvEmbed = {
  project_id: string;
  confirm_token: string | null;
  vendors: VendorEmbed | VendorEmbed[] | null;
  projects: { name: string } | { name: string }[] | null;
};

type LeadEmbed = {
  contact_email: string | null;
  couple_name: string;
};

type MessageRow = {
  id: string;
  subject: string | null;
  body: string;
  status: string;
  project_vendor_id: string | null;
  lead_id: string | null;
  project_vendors:
    | PvEmbed
    | PvEmbed[]
    | null;
  leads: LeadEmbed | LeadEmbed[] | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function sendOutreachMessage(
  messageId: string,
  options?: {
    /**
     * AGENTIC-03: route the vendor's reply through First Look (Reply-To) so
     * quotes can be captured. Off by default — ordinary outreach keeps replies
     * in the sender's own inbox.
     */
    captureReplies?: boolean;
  },
): Promise<SendOutcome> {
  const supabase = await createClient();

  const auth = await getGmailAccessForSend();

  const { data: message, error: loadError } = await supabase
    .from("outreach_messages")
    .select(
      `
      id,
      subject,
      body,
      status,
      project_vendor_id,
      lead_id,
      project_vendors (
        project_id,
        confirm_token,
        vendors ( contact_email, name ),
        projects ( name )
      ),
      leads (
        contact_email,
        couple_name
      )
    `,
    )
    .eq("id", messageId)
    .maybeSingle();

  if (loadError || !message) {
    return { ok: false, error: "Message not found." };
  }

  const row = message as MessageRow;

  if (row.status !== "draft" && row.status !== "failed") {
    return { ok: false, error: "Only draft or failed messages can be sent." };
  }

  const recipient = resolveRecipient(row);
  if (!recipient.ok) {
    await markSendFailed(supabase, messageId, recipient.error);
    return { ok: false, error: recipient.error };
  }

  const subject = row.subject?.trim();
  if (!subject) {
    return { ok: false, error: "Subject is required before sending." };
  }

  const pvForReply = asOne(row.project_vendors);

  // OUTREACH-RESEND-01: no Gmail connected → vendor emails go out through
  // First Look, with Reply-To routed back into the app (AGENTIC-03) so the
  // reply is logged, forwarded to the couple, and turned into a quote.
  // Lead emails (planner → couple) still need the planner's own mailbox.
  if (!auth.ok) {
    if (!row.project_vendor_id || !pvForReply) {
      return { ok: false, error: auth.error, needsConnect: auth.needsConnect };
    }
    const replyAddress = vendorReplyAddress(pvForReply.confirm_token ?? null);
    if (!replyAddress) {
      return { ok: false, error: auth.error, needsConnect: auth.needsConnect };
    }
    const limit = await underDailyRelayLimit(supabase, pvForReply.project_id);
    if (!limit.ok) {
      return { ok: false, error: limit.error, needsConnect: true };
    }
    const projectName = asOne(pvForReply.projects)?.name ?? "";
    const relayed = await sendEmail({
      from: relayFromHeader(projectName),
      to: recipient.toEmail,
      subject,
      text: `${row.body}\n\n—\nSent with First Look. Reply to this email to answer ${senderLabel(projectName)} directly.`,
      html: `<div style="white-space:pre-wrap;font-family:inherit">${escapeHtml(row.body)}</div><p style="color:#8a7f86;font-size:12px;margin-top:24px">Sent with First Look. Reply to this email to answer ${escapeHtml(senderLabel(projectName))} directly.</p>`,
      replyTo: replyAddress,
    });
    if (!relayed.ok) {
      await markSendFailed(supabase, messageId, relayed.error);
      return { ok: false, error: relayed.error };
    }
    return finishSent(supabase, row, messageId, null);
  }

  const replyTo =
    options?.captureReplies && row.project_vendor_id
      ? vendorReplyAddress(pvForReply?.confirm_token ?? null)
      : null;

  const sendResult = await sendGmailMessage(
    auth.accessToken,
    auth.fromEmail,
    recipient.toEmail,
    subject,
    row.body,
    replyTo ? { replyTo } : undefined,
  );

  if (!sendResult.ok) {
    await markSendFailed(supabase, messageId, sendResult.error);
    const needsConnect = /Reconnect|send permission/i.test(sendResult.error);
    return { ...sendResult, needsConnect };
  }

  return finishSent(supabase, row, messageId, sendResult.threadId ?? null);
}

/** Per-wedding cap on relayed (non-Gmail) sends, to protect our domain. */
const RELAY_DAILY_LIMIT = 20;

async function underDailyRelayLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("outreach_messages")
    .select("id, project_vendors!inner(project_id)", { count: "exact", head: true })
    .eq("project_vendors.project_id", projectId)
    .eq("direction", "outbound")
    .eq("status", "sent")
    .is("gmail_thread_id", null)
    .gte("sent_at", since);
  if (error) return { ok: true };
  if ((count ?? 0) >= RELAY_DAILY_LIMIT) {
    return {
      ok: false,
      error: `You've sent ${RELAY_DAILY_LIMIT} vendor emails through First Look today. Connect Gmail to keep sending, or try again tomorrow.`,
    };
  }
  return { ok: true };
}

function senderLabel(projectName: string): string {
  if (isDateOnlyProjectName(projectName.trim())) return "the couple";
  const cleaned = projectName
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/[<>"\r\n]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\s,–-]+$/, "")
    .trim();
  if (!cleaned || /^\d|wedding$/i.test(cleaned)) return "the couple";
  return cleaned.slice(0, 60);
}

function relayFromHeader(projectName: string): string {
  const label = senderLabel(projectName);
  const name = label === "the couple" ? "A couple" : label;
  return `"${name} via First Look" <outreach@usefirstlook.app>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function finishSent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: MessageRow,
  messageId: string,
  threadId: string | null,
): Promise<SendOutcome> {
  const { error: updateError } = await supabase
    .from("outreach_messages")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      send_error: null,
      updated_at: new Date().toISOString(),
      ...(threadId ? { gmail_thread_id: threadId } : {}),
    })
    .eq("id", messageId);

  if (updateError) {
    return {
      ok: false,
      error:
        "Email was sent but we could not update the record.",
    };
  }

  if (row.project_vendor_id) {
    await supabase
      .from("project_vendors")
      .update({ status: "contacted" })
      .eq("id", row.project_vendor_id)
      .eq("status", "to_contact");
  }

  if (row.lead_id) {
    await supabase
      .from("leads")
      .update({
        stage: "contacted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.lead_id)
      .eq("stage", "inquiry");
  }

  return { ok: true };
}

function resolveRecipient(
  row: MessageRow,
): { ok: true; toEmail: string } | { ok: false; error: string } {
  if (row.lead_id) {
    const lead = asOne(row.leads);
    if (!lead) {
      return { ok: false, error: "Lead not found for this message." };
    }
    const toEmail = lead.contact_email?.trim();
    if (!toEmail) {
      return {
        ok: false,
        error: `${lead.couple_name} has no contact email. Add one before sending.`,
      };
    }
    return { ok: true, toEmail };
  }

  const pv = asOne(row.project_vendors);
  const vendor = pv ? asOne(pv.vendors) : null;
  if (!vendor) {
    return { ok: false, error: "Vendor not found for this message." };
  }
  const toEmail = vendor.contact_email?.trim();
  if (!toEmail) {
    return {
      ok: false,
      error: `${vendor.name} has no contact email. Add one before sending.`,
    };
  }
  return { ok: true, toEmail };
}

export async function sendAllOutreachDrafts(
  projectId: string,
): Promise<
  | { ok: true; sent: number; failures: { messageId: string; error: string }[] }
  | { ok: false; error: string; needsConnect?: boolean }
> {
  const supabase = await createClient();

  const { data: pvRows } = await supabase
    .from("project_vendors")
    .select("id")
    .eq("project_id", projectId);

  const pvIds = (pvRows ?? []).map((r) => r.id);
  if (pvIds.length === 0) {
    return { ok: true, sent: 0, failures: [] };
  }

  const { data: messages } = await supabase
    .from("outreach_messages")
    .select("id")
    .in("project_vendor_id", pvIds)
    .eq("direction", "outbound")
    .eq("channel", "email")
    .in("status", ["draft", "failed"]);

  const ids = (messages ?? []).map((m) => m.id);
  if (ids.length === 0) {
    return { ok: true, sent: 0, failures: [] };
  }

  let sent = 0;
  const failures: { messageId: string; error: string }[] = [];

  for (const id of ids) {
    const result = await sendOutreachMessage(id);
    if (result.ok) {
      sent += 1;
    } else {
      failures.push({ messageId: id, error: result.error });
    }
  }

  return { ok: true, sent, failures };
}

async function markSendFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  messageId: string,
  error: string,
) {
  await supabase
    .from("outreach_messages")
    .update({
      status: "failed",
      send_error: error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);
}
