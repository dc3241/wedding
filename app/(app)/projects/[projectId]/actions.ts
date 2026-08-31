"use server";

import { revalidatePath } from "next/cache";
import {
  loadWeddingDateSyncContext,
  nextProjectNameForWeddingDate,
  patchWebsiteHeroForWeddingDateChange,
} from "@/lib/sync-wedding-date-fields";
import { parseWeddingDate } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

export type UpdateWeddingDateResult =
  | { ok: true }
  | { ok: false; error: string };

/** Write projects.wedding_date and keep name / website hero from going stale. */
export async function updateWeddingDate(
  projectId: string,
  value: string | null,
): Promise<UpdateWeddingDateResult> {
  const parsed = parseWeddingDate(value);
  if (!parsed.ok) {
    return parsed;
  }

  const supabase = await createClient();
  const ctx = await loadWeddingDateSyncContext(supabase, projectId);
  if (!ctx) {
    return { ok: false, error: "Could not update wedding date." };
  }

  const nextName = nextProjectNameForWeddingDate({
    currentName: ctx.name,
    previousDate: ctx.weddingDate,
    nextDate: parsed.date,
    accountName: ctx.accountName,
    preferAccountName: ctx.preferAccountName,
  });

  const payload: { wedding_date: string | null; name?: string } = {
    wedding_date: parsed.date,
  };
  if (nextName !== ctx.name) {
    payload.name = nextName;
  }

  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Could not update wedding date." };
  }

  await patchWebsiteHeroForWeddingDateChange(supabase, {
    projectId,
    previousName: ctx.name,
    previousDate: ctx.weddingDate,
    nextName,
    nextDate: parsed.date,
  });

  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/checklist`);
  revalidatePath(`/projects/${projectId}/website`);
  revalidatePath(`/projects/${projectId}/vendors`);
  return { ok: true };
}
