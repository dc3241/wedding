"use server";

import { headers } from "next/headers";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "throttled" | "error" };

const EMAIL_MAX = 254;

function visitorForwardedFor(headerList: Headers): string | null {
  const xff = headerList.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip")?.trim() || null;
}

/** MEDIA-02: public newsletter signup. The RPC is the only write path. */
export async function subscribeToNewsletter(formData: FormData): Promise<SubscribeResult> {
  const honeypot = formData.get("company");
  if (typeof honeypot === "string" && honeypot.trim()) return { ok: true };

  const emailRaw = formData.get("email");
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  if (!email || email.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: "invalid" };
  }

  const dateRaw = formData.get("wedding_date");
  const weddingDate =
    typeof dateRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;

  const sourceRaw = formData.get("source");
  const source = typeof sourceRaw === "string" ? sourceRaw.slice(0, 80) : null;

  const forwardedFor = visitorForwardedFor(await headers());
  const supabase = createAnonServerClient(
    forwardedFor ? { headers: { "x-forwarded-for": forwardedFor } } : undefined,
  );

  const { error } = await supabase.rpc("subscribe_newsletter", {
    p_email: email,
    p_wedding_date: weddingDate,
    p_source: source,
    p_honeypot: "",
  });

  if (error) {
    if (error.message.includes("newsletter_throttled")) return { ok: false, reason: "throttled" };
    if (error.message.includes("_invalid")) return { ok: false, reason: "invalid" };
    console.error("subscribe_newsletter:", error.message);
    return { ok: false, reason: "error" };
  }
  return { ok: true };
}
