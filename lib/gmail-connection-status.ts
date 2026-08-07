import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/utils/supabase/server";

/** Returns only the connected Gmail address — never tokens. */
export async function getGmailConnectionEmail(): Promise<string | null> {
  // Auth-scoped: must not be served from a cached RSC payload after reconnect.
  noStore();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("email_credentials")
    .select("email, refresh_token, token_expiry")
    .eq("provider", "gmail")
    .maybeSingle();

  if (!data?.email) return null;

  // Without a refresh token, access expires (~1h) and the next send forces reconnect.
  // Treat that as not durably connected so the UI asks to reconnect once, not every page.
  if (!data.refresh_token) {
    const expiresAt = data.token_expiry
      ? new Date(data.token_expiry).getTime()
      : 0;
    if (!expiresAt || Date.now() >= expiresAt) {
      return null;
    }
  }

  return data.email;
}
