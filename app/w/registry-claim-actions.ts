"use server";

import { revalidatePath } from "next/cache";
import { createAnonServerClient } from "@/utils/supabase/anon-server";

const NAME_MAX = 120;
const THROTTLE_WINDOW_MS = 60_000;
const THROTTLE_MAX = 10;

export type ClaimStatus = "reserved" | "purchased";

export type SubmitRegistryClaimInput = {
  slug: string;
  registryItemId: string;
  status: ClaimStatus;
  claimerName?: string;
  quantity?: number;
  honeypot?: string;
};

/**
 * Anon INSERT claim. project_id derived server-side from the item row.
 * Honeypot filled → rejected. Soft throttle mirrors RSVP (best-effort).
 */
export async function submitRegistryClaim(
  input: SubmitRegistryClaimInput,
): Promise<{ ok: true } | { ok: false }> {
  if (input.honeypot?.trim()) {
    return { ok: false };
  }

  const slug = input.slug.trim();
  const registryItemId = input.registryItemId.trim();
  if (!slug || !registryItemId) {
    return { ok: false };
  }

  const status: ClaimStatus | null =
    input.status === "reserved" || input.status === "purchased"
      ? input.status
      : null;
  if (!status) {
    return { ok: false };
  }

  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));

  const nameRaw = input.claimerName?.trim() ?? "";
  if (nameRaw.length > NAME_MAX) {
    return { ok: false };
  }

  const supabase = createAnonServerClient();

  // Derive project from the item — never trust a client-sent project_id.
  // Unpublished sites: registry_items anon SELECT fails → no row.
  const { data: item, error: itemError } = await supabase
    .from("registry_items")
    .select("id, project_id")
    .eq("id", registryItemId)
    .maybeSingle();

  if (itemError || !item?.project_id) {
    return { ok: false };
  }

  const projectId = String(item.project_id);

  // Soft spam mitigation (best-effort): anon has no SELECT on registry_claims,
  // so this count cannot succeed today — it no-ops when denied.
  const windowStart = new Date(Date.now() - THROTTLE_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("registry_claims")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("created_at", windowStart);

  if (count !== null && count >= THROTTLE_MAX) {
    return { ok: false };
  }

  const { error: insertError } = await supabase.from("registry_claims").insert({
    project_id: projectId,
    registry_item_id: registryItemId,
    quantity,
    status,
    claimer_name: nameRaw || null,
  });

  if (insertError) {
    return { ok: false };
  }

  revalidatePath(`/w/${slug}/registry`);
  return { ok: true };
}
