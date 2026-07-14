"use server";

import { revalidatePath } from "next/cache";
import { parseWeddingDate } from "@/lib/wedding-date";
import { createClient } from "@/utils/supabase/server";

export type UpdateWeddingDateResult =
  | { ok: true }
  | { ok: false; error: string };

/** Narrow write: projects.wedding_date only. RLS via existing UPDATE policy. */
export async function updateWeddingDate(
  projectId: string,
  value: string | null,
): Promise<UpdateWeddingDateResult> {
  const parsed = parseWeddingDate(value);
  if (!parsed.ok) {
    return parsed;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .update({ wedding_date: parsed.date })
    .eq("id", projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Could not update wedding date." };
  }

  revalidatePath(`/projects/${projectId}`, "layout");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/checklist`);
  return { ok: true };
}
