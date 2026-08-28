"use server";

import { redirect } from "next/navigation";
import { appOrigin } from "@/lib/url";
import { createClient } from "@/utils/supabase/server";

const GENERIC_SENT_PATH = "/forgot-password?sent=1";

function isLightEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Always ends on the same generic success page. Do not branch on whether
 * the email exists — resetPasswordForEmail errors are swallowed on purpose.
 */
export async function requestPasswordReset(formData: FormData) {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim() : "";

  if (!email || email.length > 254 || !isLightEmail(email)) {
    redirect("/forgot-password?error=email");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appOrigin()}/auth/reset-password`,
  });

  if (error) {
    console.error("password-reset: request failed", error.message);
  }

  redirect(GENERIC_SENT_PATH);
}
