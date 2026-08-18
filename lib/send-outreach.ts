import { getGmailAccessForSend } from "@/lib/gmail-credentials";
import { sendGmailMessage } from "@/lib/gmail-send";
import { createClient } from "@/utils/supabase/server";

type SendOutcome =
  | { ok: true }
  | { ok: false; error: string; needsConnect?: boolean };

type VendorEmbed = {
  contact_email: string | null;
  name: string;
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
    | { vendors: VendorEmbed | VendorEmbed[] | null }
    | { vendors: VendorEmbed | VendorEmbed[] | null }[]
    | null;
  leads: LeadEmbed | LeadEmbed[] | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function sendOutreachMessage(
  messageId: string,
): Promise<SendOutcome> {
  const supabase = await createClient();

  const auth = await getGmailAccessForSend();
  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
      needsConnect: auth.needsConnect,
    };
  }

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
        vendors ( contact_email, name )
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

  const sendResult = await sendGmailMessage(
    auth.accessToken,
    auth.fromEmail,
    recipient.toEmail,
    subject,
    row.body,
  );

  if (!sendResult.ok) {
    await markSendFailed(supabase, messageId, sendResult.error);
    const needsConnect = /Reconnect|send permission/i.test(sendResult.error);
    return { ...sendResult, needsConnect };
  }

  const { error: updateError } = await supabase
    .from("outreach_messages")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      send_error: null,
      updated_at: new Date().toISOString(),
      ...(sendResult.threadId ? { gmail_thread_id: sendResult.threadId } : {}),
    })
    .eq("id", messageId);

  if (updateError) {
    return {
      ok: false,
      error:
        "Email was sent but we could not update the record. Check your Gmail Sent folder.",
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

  const auth = await getGmailAccessForSend();
  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
      needsConnect: auth.needsConnect,
    };
  }

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
