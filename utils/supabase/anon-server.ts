import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client with the anon key and no user session.
 * Used for public reads where RLS (e.g. published = true) is the access gate.
 * Never use the service-role key here.
 */
export function createAnonServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase anon configuration.");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
