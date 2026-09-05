"use server";

import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import type { AudienceGroup } from "@/lib/admin/platform-audience";
import { createClient } from "@/utils/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) throw new Error("Not authorized");
  return supabase;
}

function revalidateAutomations() {
  revalidatePath("/admin/automations");
  revalidatePath("/admin/couples/automations");
  revalidatePath("/admin/planner/automations");
  revalidatePath("/admin");
}

export type PromptInput = {
  name: string;
  description: string | null;
  prompt_template: string;
  is_manual_trigger: boolean;
  audience_group: AudienceGroup | null;
};

export async function createPrompt(input: PromptInput) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("admin_automation_prompts").insert(input);
  if (error) throw new Error(error.message);
  revalidateAutomations();
}

export async function updatePrompt(id: string, input: Partial<PromptInput>) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("admin_automation_prompts")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAutomations();
}

export async function deletePrompt(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("admin_automation_prompts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAutomations();
}

export async function setRunSavedToBank(runId: string, saved: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("admin_automation_runs")
    .update({ saved_to_bank: saved })
    .eq("id", runId);
  if (error) throw new Error(error.message);
  revalidateAutomations();
}

export async function deleteRun(runId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("admin_automation_runs").delete().eq("id", runId);
  if (error) throw new Error(error.message);
  revalidateAutomations();
}
