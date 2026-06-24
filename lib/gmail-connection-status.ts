import { createClient } from "@/utils/supabase/server";

/** Returns only the connected Gmail address — never tokens. */
export async function getGmailConnectionEmail(): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("email_credentials")
    .select("email")
    .eq("provider", "gmail")
    .maybeSingle();

  return data?.email ?? null;
}
