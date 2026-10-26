"use server";

import { createAnonServerClient } from "@/utils/supabase/anon-server";

export type ConfirmVendorShareResult =
  | { ok: true; alreadyConfirmed: boolean }
  | { ok: false };

export async function confirmVendorShareArrival(
  token: string,
): Promise<ConfirmVendorShareResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false };

  const supabase = createAnonServerClient();
  const { data, error } = await supabase.rpc("confirm_project_vendor", {
    p_token: trimmed,
  });

  if (error || !data) return { ok: false };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.already_confirmed !== "boolean") {
    return { ok: false };
  }

  return { ok: true, alreadyConfirmed: row.already_confirmed };
}
