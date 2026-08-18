"use server";

import { headers } from "next/headers";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

const NAME_MAX = 120;
const EMAIL_MAX = 254;
const MESSAGE_MAX = 4000;

export type SubmitInquiryInput = {
  slug: string;
  name: string;
  email: string;
  message?: string;
  weddingDate?: string;
  guestCount?: string;
  honeypot?: string;
};

export type SubmitInquiryResult =
  | { ok: true }
  | { ok: false; reason: "throttled" | "error" };

function isLightEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isInquiryThrottled(message: string | undefined): boolean {
  return Boolean(message && message.includes("inquiry_throttled"));
}

function visitorForwardedFor(headerList: Headers): string | null {
  const xff = headerList.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip")?.trim() || null;
}

export async function submitInquiry(
  input: SubmitInquiryInput,
): Promise<SubmitInquiryResult> {
  if (input.honeypot?.trim()) {
    return { ok: true };
  }

  const slug = input.slug.trim().toLowerCase();
  if (!slug) {
    return { ok: false, reason: "error" };
  }

  const name = input.name.trim();
  if (!name || name.length > NAME_MAX) {
    return { ok: false, reason: "error" };
  }

  const email = input.email.trim();
  if (!email || email.length > EMAIL_MAX || !isLightEmail(email)) {
    return { ok: false, reason: "error" };
  }

  const messageRaw = input.message?.trim() ?? "";
  if (messageRaw.length > MESSAGE_MAX) {
    return { ok: false, reason: "error" };
  }

  const weddingRaw = input.weddingDate?.trim() ?? "";
  const weddingDate = /^\d{4}-\d{2}-\d{2}$/.test(weddingRaw)
    ? weddingRaw
    : null;

  const guestRaw = input.guestCount?.trim() ?? "";
  const guestParsed = guestRaw ? Number(guestRaw) : null;
  const guestCount =
    guestParsed !== null &&
    Number.isInteger(guestParsed) &&
    guestParsed >= 1 &&
    guestParsed <= 20000
      ? guestParsed
      : null;

  const headerList = await headers();
  const forwardedFor = visitorForwardedFor(headerList);
  const supabase = createAnonServerClient(
    forwardedFor ? { headers: { "x-forwarded-for": forwardedFor } } : undefined,
  );

  const { error } = await supabase.rpc("submit_inquiry", {
    p_slug: slug,
    p_name: name,
    p_email: email,
    p_message: messageRaw || null,
    p_honeypot: "",
    p_wedding_date: weddingDate,
    p_guest_count: guestCount,
  });

  if (error) {
    if (isInquiryThrottled(error.message)) {
      return { ok: false, reason: "throttled" };
    }
    return { ok: false, reason: "error" };
  }

  return { ok: true };
}
