import { getGmailAccessForSend } from "@/lib/gmail-credentials";
import { sendGmailMessage } from "@/lib/gmail-send";
import { createClient } from "@/utils/supabase/server";

type DraftRow = {
  id: string;
  subject: string | null;
  body: string;
  status: string;
  project_vendor_id: string;
};

type SendOutcome =
  | { ok: true }
  | { ok: false; error: string; needsConnect?: boolean };

export async function sendOutreachMessage(
  messageId: string
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
      project_vendors (
        vendors ( contact_email, name )
      )
    `
    )
    .eq("id", messageId)
    .maybeSingle();

  if (loadError || !message) {
    return { ok: false, error: "Message not found." };
  }

  const row = message as DraftRow & {
    project_vendors: {
      vendors: { contact_email: string | null; name: string } | { contact_email: string | null; name: string }[];
    } | { vendors: { contact_email: string | null; name: string } | { contact_email: string | null; name: string }[] }[];
  };

  if (row.status !== "draft" && row.status !== "failed") {
    return { ok: false, error: "Only draft or failed messages can be sent." };
  }

  const pv = Array.isArray(row.project_vendors)
    ? row.project_vendors[0]
    : row.project_vendors;
  const vendor = pv
    ? Array.isArray(pv.vendors)
      ? pv.vendors[0]
      : pv.vendors
    : null;

  if (!vendor) {
    return { ok: false, error: "Vendor not found for this message." };
  }

  const toEmail = vendor.contact_email?.trim();
  if (!toEmail) {
    const failError = `${vendor.name} has no contact email. Add one before sending.`;
    await markSendFailed(supabase, messageId, failError);
    return { ok: false, error: failError };
  }

  const subject = row.subject?.trim();
  if (!subject) {
    return { ok: false, error: "Subject is required before sending." };
  }

  const sendResult = await sendGmailMessage(
    auth.accessToken,
    auth.fromEmail,
    toEmail,
    subject,
    row.body
  );

  if (!sendResult.ok) {
    await markSendFailed(supabase, messageId, sendResult.error);
    return sendResult;
  }

  const { error: updateError } = await supabase
    .from("outreach_messages")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      send_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (updateError) {
    return {
      ok: false,
      error:
        "Email was sent but we could not update the record. Check your Gmail Sent folder.",
    };
  }

  return { ok: true };
}

export async function sendAllOutreachDrafts(
  projectId: string
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
  error: string
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
