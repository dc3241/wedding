"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function budgetPath(projectId: string) {
  return `/projects/${projectId}/budget`;
}

export async function setBudgetTarget(projectId: string, amount: number | null) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("projects")
    .update({ total_budget: amount })
    .eq("id", projectId);

  if (error) throw error;

  revalidatePath(budgetPath(projectId));
}

export async function addBudgetItem(
  projectId: string,
  category: string,
  label: string,
  plannedAmount: number,
  actualAmount?: number | null,
) {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return;

  const supabase = await createClient();

  const { error } = await supabase.from("budget_items").insert({
    project_id: projectId,
    category: category.trim() || null,
    label: trimmedLabel,
    planned_amount: Math.max(0, plannedAmount || 0),
    actual_amount: actualAmount ?? null,
  });

  if (error) throw error;

  revalidatePath(budgetPath(projectId));
}

export async function updateBudgetItem(
  itemId: string,
  fields: {
    category?: string;
    label?: string;
    planned_amount?: number;
    actual_amount?: number | null;
    notes?: string;
  },
) {
  const updates: Record<string, string | number | null> = {};

  if (fields.category !== undefined) {
    updates.category = fields.category.trim() || null;
  }

  if (fields.label !== undefined) {
    const trimmed = fields.label.trim();
    if (!trimmed) return;
    updates.label = trimmed;
  }

  if (fields.planned_amount !== undefined) {
    updates.planned_amount = Math.max(0, fields.planned_amount || 0);
  }

  if (fields.actual_amount !== undefined) {
    updates.actual_amount = fields.actual_amount;
  }

  if (fields.notes !== undefined) {
    updates.notes = fields.notes.trim() || null;
  }

  if (Object.keys(updates).length === 0) return;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_items")
    .update(updates)
    .eq("id", itemId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(budgetPath(data.project_id));
}

export async function removeBudgetItem(itemId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_items")
    .delete()
    .eq("id", itemId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidatePath(budgetPath(data.project_id));
}
