"use server";

import { revalidatePath } from "next/cache";
import { addSeatingRule } from "@/lib/seating/auto-seat";
import { createClient } from "@/utils/supabase/server";

export type RuleActionResult = { ok: true } | { ok: false; error: string };

/** AGENTIC-07: save a keep-together / keep-apart rule (RLS: can_edit_project). */
export async function createSeatingRule(
  projectId: string,
  kind: string,
  memberA: string,
  memberB: string,
): Promise<RuleActionResult> {
  const result = await addSeatingRule(projectId, { kind, memberA, memberB });
  if (!result.ok) return result;
  revalidatePath(`/projects/${projectId}/seating`);
  return { ok: true };
}

export async function removeSeatingRule(ruleId: string): Promise<RuleActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seating_rules")
    .delete()
    .eq("id", ruleId)
    .select("project_id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "That rule is already gone." };
  revalidatePath(`/projects/${data.project_id}/seating`);
  return { ok: true };
}
