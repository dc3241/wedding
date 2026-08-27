"use server";

import { sendEmail } from "@/lib/email/send";

const NAME_MAX = 120;
const EMAIL_MAX = 254;
const MESSAGE_MAX = 4000;

const AUDIENCE_LABELS = {
  couple: "Couple",
  planner_or_venue: "Planner or venue",
  press_or_other: "Press or other",
} as const;

type AudienceKey = keyof typeof AUDIENCE_LABELS;

export type SubmitContactResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "send_failed" };

function isAudience(value: string): value is AudienceKey {
  return value in AUDIENCE_LABELS;
}

function isLightEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function submitContactMessage(
  formData: FormData,
): Promise<SubmitContactResult> {
  if (readString(formData, "website").trim()) {
    return { ok: true };
  }

  const name = readString(formData, "name").trim();
  const email = readString(formData, "email").trim();
  const audienceRaw = readString(formData, "audience").trim();
  const message = readString(formData, "message").trim();

  if (!name || name.length > NAME_MAX) {
    return { ok: false, reason: "invalid" };
  }
  if (!email || email.length > EMAIL_MAX || !isLightEmail(email)) {
    return { ok: false, reason: "invalid" };
  }
  if (!isAudience(audienceRaw)) {
    return { ok: false, reason: "invalid" };
  }
  if (!message || message.length > MESSAGE_MAX) {
    return { ok: false, reason: "invalid" };
  }

  const notifyTo = process.env.CONTACT_NOTIFY_EMAIL?.trim();
  if (!notifyTo) {
    console.error("contact-form: CONTACT_NOTIFY_EMAIL unset");
    return { ok: false, reason: "send_failed" };
  }

  const audienceLabel = AUDIENCE_LABELS[audienceRaw];
  const subject = `[Contact] ${audienceLabel} — ${name}`;
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Audience: ${audienceLabel}`,
    "",
    "Message:",
    message,
  ].join("\n");
  const html = [
    `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`,
    `<p><strong>Email:</strong> ${escapeHtml(email)}</p>`,
    `<p><strong>Audience:</strong> ${escapeHtml(audienceLabel)}</p>`,
    `<p><strong>Message:</strong></p>`,
    `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`,
  ].join("\n");

  try {
    const sent = await sendEmail({
      to: notifyTo,
      subject,
      text,
      html,
      replyTo: email,
    });
    if (!sent.ok) {
      console.error("contact-form: email send failed:", sent.error);
      return { ok: false, reason: "send_failed" };
    }
  } catch (err) {
    console.error("contact-form: email send failed:", err);
    return { ok: false, reason: "send_failed" };
  }

  return { ok: true };
}
