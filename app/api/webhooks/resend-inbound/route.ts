/**
 * AUTO-03a — Resend inbound capture.
 * Signature-verified, service-role insert. No LLM.
 */
import { NextResponse } from "next/server";
import { Resend } from "resend";
import {
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

  const domain = inquiryInboundDomain();
  if (!domain) {
    console.info("resend-inbound: INQUIRY_INBOUND_DOMAIN unset; ignoring.");
    return NextResponse.json({ received: true, ignored: "domain_unconfigured" });
  }

  const recipients = [
    ...(event.data.to ?? []),
    ...(event.data.received_for ?? []),
  ];
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
