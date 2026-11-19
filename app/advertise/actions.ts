"use server";

import { ADVERTISE_INTERESTS } from "@/app/advertise/interests";
import { sendEmail } from "@/lib/email/send";

export type AdvertiseResult = { ok: true } | { ok: false; reason: "invalid" | "send_failed" };

function read(fd: FormData, key: string, max: number): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** MEDIA-09: advertiser inquiries go to CONTACT_NOTIFY_EMAIL, same as /contact. */
export async function submitAdvertiseInquiry(fd: FormData): Promise<AdvertiseResult> {
  if (read(fd, "website", 200)) return { ok: true };

  const name = read(fd, "name", 120);
  const business = read(fd, "business", 160);
  const email = read(fd, "email", 254);
  const interestRaw = read(fd, "interest", 40);
  const message = read(fd, "message", 4000);
  if (!name || !business || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "invalid" };
  if (!(interestRaw in ADVERTISE_INTERESTS)) return { ok: false, reason: "invalid" };
  const interest = ADVERTISE_INTERESTS[interestRaw as keyof typeof ADVERTISE_INTERESTS];

  const to = process.env.CONTACT_NOTIFY_EMAIL?.trim();
  if (!to) {
    console.error("advertise: CONTACT_NOTIFY_EMAIL unset");
    return { ok: false, reason: "send_failed" };
  }

  const lines = [`Name: ${name}`, `Business: ${business}`, `Email: ${email}`, `Interested in: ${interest}`, "", message || "(no message)"];
  try {
    const sent = await sendEmail({
      to,
      subject: `[Advertise] ${interest} — ${business}`,
      text: lines.join("\n"),
      html: lines.map((l) => `<p>${escapeHtml(l) || "&nbsp;"}</p>`).join("\n"),
      replyTo: email,
    });
    if (!sent.ok) return { ok: false, reason: "send_failed" };
  } catch (err) {
    console.error("advertise: send failed:", err);
    return { ok: false, reason: "send_failed" };
  }
  return { ok: true };
}
