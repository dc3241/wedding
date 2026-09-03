import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ADMIN-00: is_admin() is a SECURITY DEFINER RPC (0103) — reads admin_roles
 * for auth.uid(). admin_roles itself has zero client-facing RLS policies
 * (service-role only), so this RPC is the ONLY way app code learns whether
 * the calling user is an admin. Never query admin_roles directly.
 */
export async function checkIsAdmin(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return data === true;
}
