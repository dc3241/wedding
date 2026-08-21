/**
 * AUTO-03a — Resend inbound capture.
 * CONTACT-ROUTE-01 — admin@ relay onto CONTACT_NOTIFY_EMAIL (same webhook).
 * Signature-verified. Inquiry path inserts via service-role. No LLM.
 */
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { sendEmail } from "@/lib/email/send";
import {
  extractEmailAddress,
  inquiryInboundDomain,
  parseFromHeader,
  slugFromRecipientAddresses,
} from "@/lib/inquiry/parse";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  if (!webhookSecret || !apiKey) {
    return NextResponse.json(
      { error: "Inbound webhook is not configured." },
      { status: 500 },
    );
  }

  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const payload = await req.text();
  const resend = new Resend(apiKey);

  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ received: true });
  }

  const recipients = [
    ...(event.data.to ?? []),
    ...(event.data.received_for ?? []),
  ];

  const adminAddress = process.env.ADMIN_INBOUND_ADDRESS?.trim().toLowerCase();
  if (adminAddress && recipientsIncludeAddress(recipients, adminAddress)) {
    return forwardAdminInbound(event, resend, adminAddress);
  }

  const domain = inquiryInboundDomain();
  if (!domain) {
    console.info("resend-inbound: INQUIRY_INBOUND_DOMAIN unset; ignoring.");
    return NextResponse.json({ received: true, ignored: "domain_unconfigured" });
  }

  const slug = slugFromRecipientAddresses(recipients, domain);
  if (!slug) {
    console.info("resend-inbound: no matching inbound recipient; ignoring.");
    return NextResponse.json({ received: true, ignored: "unknown_slug" });
  }

  const supabase = createServiceRoleClient();
  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("inquiry_slug", slug)
    .eq("kind", "business")
    .maybeSingle();

  if (accountError) {
    console.error("resend-inbound: account lookup", accountError.message);
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!account) {
    console.info(`resend-inbound: unrecognized slug ${slug}; ignoring.`);
    return NextResponse.json({ received: true, ignored: "unknown_slug" });
  }

  const emailId = event.data.email_id;
  if (emailId) {
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("account_id", account.id)
      .eq("source", "email_inbound")
      .like("notes", `[resend:${emailId}]%`)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  const fromParsed = parseFromHeader(event.data.from);
  const subject = event.data.subject.trim();

  let bodyText = "";
  if (emailId) {
    try {
      const { data: received, error: receiveError } =
        await resend.emails.receiving.get(emailId);
      if (receiveError) {
        console.error("resend-inbound: receiving.get", receiveError.message);
      } else {
        bodyText = (received?.text || received?.html || "").trim();
      }
    } catch (err) {
      console.error("resend-inbound: receiving.get", err);
    }
  }

  const noteParts = [
    emailId ? `[resend:${emailId}]` : null,
    subject ? `Subject: ${subject}` : null,
    bodyText || (emailId ? "Body could not be retrieved." : null),
  ].filter(Boolean);

  const { data: positionRow } = await supabase
    .from("leads")
    .select("position")
    .eq("account_id", account.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error: insertError } = await supabase.from("leads").insert({
    account_id: account.id,
    couple_name: fromParsed.name.slice(0, 200) || "Inquiry",
    contact_email: fromParsed.email,
    source: "email_inbound",
    stage: "inquiry",
    notes: noteParts.join("\n\n") || null,
    position: (positionRow?.position ?? 0) + 1,
  });

  if (insertError) {
    console.error("resend-inbound: insert", insertError.message);
    return NextResponse.json({ error: "Could not save inquiry." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function recipientsIncludeAddress(
  recipients: string[],
  address: string,
): boolean {
  const target = address.trim().toLowerCase();
  if (!target.includes("@")) return false;
  return recipients.some((raw) => extractEmailAddress(raw) === target);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function forwardAdminInbound(
  event: { data: { email_id: string; from: string; subject: string } },
  resend: Resend,
  adminAddress: string,
): Promise<NextResponse> {
  const notifyTo = process.env.CONTACT_NOTIFY_EMAIL?.trim();
  if (!notifyTo) {
    console.info("resend-inbound: CONTACT_NOTIFY_EMAIL unset; ignoring admin inbound.");
    return NextResponse.json({ received: true, ignored: "notify_unconfigured" });
  }

  const fromParsed = parseFromHeader(event.data.from);
  const subject = `[${adminAddress}] ${event.data.subject.trim()}`.trim();
  const note = `Forwarded from ${adminAddress}.`;

  let originalText = "";
  let originalHtml = "";
  const emailId = event.data.email_id;
  if (emailId) {
    try {
      const { data: received, error: receiveError } =
        await resend.emails.receiving.get(emailId);
      if (receiveError) {
        console.error("resend-inbound: admin receiving.get", receiveError.message);
      } else {
        originalText = (received?.text || "").trim();
        originalHtml = (received?.html || "").trim();
      }
    } catch (err) {
      console.error("resend-inbound: admin receiving.get", err);
    }
  }

  const text = [note, originalText || originalHtml].filter(Boolean).join("\n\n");
  const htmlBody =
    originalHtml ||
    (originalText ? `<pre>${escapeHtml(originalText)}</pre>` : "");
  const html = `<p>${escapeHtml(note)}</p>${htmlBody ? `\n${htmlBody}` : ""}`;

  const sent = await sendEmail({
    to: notifyTo,
    subject,
    text,
    html,
    ...(fromParsed.email ? { replyTo: fromParsed.email } : {}),
  });

  if (!sent.ok) {
    console.error("resend-inbound: admin forward failed", sent.error);
    return NextResponse.json({ error: "Forward failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true, forwarded: true });
}
