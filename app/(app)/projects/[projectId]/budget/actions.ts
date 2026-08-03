"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function budgetPath(projectId: string) {
  return `/projects/${projectId}/budget`;
}

function revalidateBudget(projectId: string) {
  revalidatePath(budgetPath(projectId));
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/vendors`);
  revalidatePath("/calendar");
}

/** YYYY-MM-DD only — rejects timestamps / empty. */
function parseDateOnly(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  const check = new Date(y!, m! - 1, d!);
  if (
    check.getFullYear() !== y ||
    check.getMonth() !== m! - 1 ||
    check.getDate() !== d
  ) {
    return null;
  }
  return trimmed;
}

export async function setBudgetTarget(projectId: string, amount: number | null) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("projects")
    .update({ total_budget: amount })
    .eq("id", projectId);

  if (error) throw error;

  revalidateBudget(projectId);
}

export async function addBudgetItem(
  projectId: string,
  category: string,
  label: string | null,
  plannedAmount: number,
  actualAmount?: number | null,
  dueDate?: string | null,
) {
  const trimmedLabel = (label ?? "").trim() || null;
  const planned = Math.max(0, plannedAmount || 0);

  let dueDateValue: string | null = null;
  if (dueDate != null && dueDate.trim() !== "") {
    dueDateValue = parseDateOnly(dueDate);
    if (dueDateValue === null) {
      throw new Error("dueDate must be a valid YYYY-MM-DD date");
    }
  }

  const supabase = await createClient();

  // due_date is write-dead (BUD-SCHED-01) — first installment goes on payment_schedule.
  const { data: item, error } = await supabase
    .from("budget_items")
    .insert({
      project_id: projectId,
      category: category.trim() || null,
      label: trimmedLabel,
      planned_amount: planned,
      actual_amount: actualAmount ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  if (dueDateValue != null) {
    const { error: scheduleError } = await supabase
      .from("payment_schedule")
      .insert({
        project_id: projectId,
        budget_item_id: item.id,
        amount: planned,
        due_on: dueDateValue,
        label: "Balance",
      });
    if (scheduleError) throw scheduleError;
  }

  revalidateBudget(projectId);
  return { id: item.id };
}

/** Quick-add bulk: one 0-planned row per category string. No dedupe. Free-text category. */
export async function addBudgetItemsBulk(
  projectId: string,
  categories: string[],
) {
  const rows = categories
    .map((category) => category.trim())
    .filter((category) => category.length > 0)
    .map((category) => ({
      project_id: projectId,
      category,
      label: null,
      planned_amount: 0,
      actual_amount: null,
      due_date: null,
    }));

  if (rows.length === 0) return;

  const supabase = await createClient();

  const { error } = await supabase.from("budget_items").insert(rows);

  if (error) throw error;

  revalidateBudget(projectId);
}

export async function updateBudgetItem(
  itemId: string,
  fields: {
    category?: string;
    label?: string | null;
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
    updates.label = (fields.label ?? "").trim() || null;
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

  revalidateBudget(data.project_id);
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

  revalidateBudget(data.project_id);
}

export type SetBudgetItemProjectVendorResult =
  | { ok: true }
  | { ok: false; error: string };

export async function setBudgetItemProjectVendor(
  itemId: string,
  projectVendorId: string | null,
): Promise<SetBudgetItemProjectVendorResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_items")
    .update({ project_vendor_id: projectVendorId })
    .eq("id", itemId)
    .select("project_id")
    .single();

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "That vendor isn't part of this project.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidateBudget(data.project_id);
  return { ok: true };
}

export async function addBudgetPayment(
  projectId: string,
  budgetItemId: string,
  amount: number,
  paidOn: string,
  note?: string | null,
) {
  if (!(amount > 0) || Number.isNaN(amount)) {
    throw new Error("amount must be a positive number");
  }

  const paidOnDate = parseDateOnly(paidOn);
  if (paidOnDate === null) {
    throw new Error("paidOn must be a valid YYYY-MM-DD date");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("budget_payments").insert({
    project_id: projectId,
    budget_item_id: budgetItemId,
    amount,
    paid_on: paidOnDate,
    note: (note ?? "").trim() || null,
  });

  if (error) throw error;

  revalidateBudget(projectId);
}

export async function removeBudgetPayment(paymentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_payments")
    .delete()
    .eq("id", paymentId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidateBudget(data.project_id);
}

export async function addScheduleInstallment(
  projectId: string,
  budgetItemId: string,
  amount: number,
  dueOn: string,
  label?: string | null,
) {
  if (!(amount >= 0) || Number.isNaN(amount)) {
    throw new Error("amount must be a non-negative number");
  }

  const dueOnDate = parseDateOnly(dueOn);
  if (dueOnDate === null) {
    throw new Error("dueOn must be a valid YYYY-MM-DD date");
  }

  const supabase = await createClient();

  const { error } = await supabase.from("payment_schedule").insert({
    project_id: projectId,
    budget_item_id: budgetItemId,
    amount,
    due_on: dueOnDate,
    label: (label ?? "").trim() || null,
  });

  if (error) throw error;

  revalidateBudget(projectId);
}

export async function removeScheduleInstallment(installmentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payment_schedule")
    .delete()
    .eq("id", installmentId)
    .select("project_id")
    .single();

  if (error) throw error;

  revalidateBudget(data.project_id);
}

export async function dismissBudgetAlert(
  projectId: string,
  category: string,
  overageNow: number,
) {
  const supabase = await createClient();

  const { error } = await supabase.from("budget_alert_dismissals").upsert(
    {
      project_id: projectId,
      category,
      alert_kind: "over_plan",
      overage_at_dismiss: overageNow,
    },
    { onConflict: "project_id,category,alert_kind" },
  );

  if (error) throw error;

  revalidateBudget(projectId);
}
