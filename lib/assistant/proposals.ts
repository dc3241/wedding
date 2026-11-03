import "server-only";

import { clientForWrite } from "@/utils/supabase/for-write";
import type { SupabaseClient } from "@supabase/supabase-js";

/** AGENTIC-01 — assistant proposals (propose-then-approve for non-email changes). */

export const MAX_BUDGET_CHANGES = 12;

export type BudgetChange =
  | { op: "set_target"; from: number | null; to: number }
  | {
      op: "set_planned";
      itemId: string;
      label: string;
      from: number;
      to: number;
    }
  | {
      op: "add_item";
      category: string | null;
      label: string | null;
      planned: number;
    };

export type BudgetProposalPayload = { changes: BudgetChange[] };

export type CreateBudgetProposalResult =
  | { ok: true; proposalId: string; changeCount: number }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** One human line per change, used in the panel and the tool result. */
export function describeBudgetChange(change: BudgetChange): string {
  switch (change.op) {
    case "set_target":
      return change.from === null
        ? `Set total budget to ${money(change.to)}`
        : `Total budget ${money(change.from)} → ${money(change.to)}`;
    case "set_planned":
      return `${change.label}: ${money(change.from)} → ${money(change.to)}`;
    case "add_item": {
      const name = change.label || change.category || "New line";
      return `Add ${name} at ${money(change.planned)}`;
    }
  }
}

type RawChange = Record<string, unknown>;

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * Validate the model's raw change list against the live budget and snapshot
 * the "from" values. Nothing is written to budget tables here.
 */
export async function createBudgetProposal(
  projectId: string,
  input: { title: string; summary?: string; changes: unknown },
  client?: SupabaseClient,
): Promise<CreateBudgetProposalResult> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title is required." };
  if (!Array.isArray(input.changes) || input.changes.length === 0) {
    return { ok: false, error: "changes must be a non-empty list." };
  }
  if (input.changes.length > MAX_BUDGET_CHANGES) {
    return {
      ok: false,
      error: `Propose at most ${MAX_BUDGET_CHANGES} changes at a time.`,
    };
  }

  const supabase = await clientForWrite(client);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, account_id, total_budget")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) return { ok: false, error: projectError.message };
  if (!project) return { ok: false, error: "Project not found." };

  const { data: items, error: itemsError } = await supabase
    .from("budget_items")
    .select("id, label, category, planned_amount")
    .eq("project_id", projectId);
  if (itemsError) return { ok: false, error: itemsError.message };
  const byId = new Map((items ?? []).map((row) => [row.id as string, row]));

  const changes: BudgetChange[] = [];
  const touchedItems = new Set<string>();
  let sawTarget = false;

  for (const raw of input.changes as RawChange[]) {
    const op = str(raw?.op);
    if (op === "set_target") {
      const to = num(raw.amount);
      if (to === undefined || to < 0) {
        return { ok: false, error: "set_target needs a non-negative amount." };
      }
      if (sawTarget) {
        return { ok: false, error: "Only one set_target change is allowed." };
      }
      sawTarget = true;
      const current = num(project.total_budget);
      changes.push({ op: "set_target", from: current ?? null, to });
    } else if (op === "set_planned") {
      const itemId = str(raw.item_id)?.trim();
      const to = num(raw.amount);
      if (!itemId || !UUID_RE.test(itemId)) {
        return { ok: false, error: "set_planned needs a valid item_id." };
      }
      if (to === undefined || to < 0) {
        return { ok: false, error: "set_planned needs a non-negative amount." };
      }
      const item = byId.get(itemId);
      if (!item) {
        return {
          ok: false,
          error: `Budget item ${itemId} is not on this project. Call get_budget for current ids.`,
        };
      }
      if (touchedItems.has(itemId)) {
        return { ok: false, error: "Each budget item can change only once." };
      }
      touchedItems.add(itemId);
      changes.push({
        op: "set_planned",
        itemId,
        label: (item.label as string | null) || (item.category as string | null) || "Budget line",
        from: Number(item.planned_amount ?? 0),
        to,
      });
    } else if (op === "add_item") {
      const planned = num(raw.amount);
      if (planned === undefined || planned < 0) {
        return { ok: false, error: "add_item needs a non-negative amount." };
      }
      const category = str(raw.category)?.trim() || null;
      const label = str(raw.label)?.trim() || null;
      if (!category && !label) {
        return { ok: false, error: "add_item needs a category or label." };
      }
      changes.push({ op: "add_item", category, label, planned });
    } else {
      return {
        ok: false,
        error: "Each change op must be set_target, set_planned, or add_item.",
      };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload: BudgetProposalPayload = { changes };
  const { data: inserted, error: insertError } = await supabase
    .from("assistant_proposals")
    .insert({
      account_id: project.account_id,
      project_id: projectId,
      kind: "budget_change",
      title,
      summary: input.summary?.trim() || null,
      payload,
      status: "pending",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message ?? "Could not save the proposal." };
  }

  return { ok: true, proposalId: inserted.id, changeCount: changes.length };
}

/** AGENTIC-03 — a vendor's emailed quote, awaiting the couple's OK. */
export type VendorQuotePayload = {
  projectVendorId: string;
  vendorName: string;
  outreachMessageId: string | null;
  quote: {
    availability: "available" | "unavailable" | "unclear";
    price: number | null;
    priceBasis: "total" | "starting_at" | "per_person" | "hourly" | "unclear" | null;
    deposit: number | null;
    inclusions: string[];
    conditions: string | null;
    questionsForCouple: string[];
    summary: string;
  };
};

const BASIS_LABEL: Record<string, string> = {
  total: "total",
  starting_at: "starting at",
  per_person: "per person",
  hourly: "per hour",
  unclear: "basis unclear",
};

/** One human line per fact, shared by the Pending card and the assistant. */
export function describeVendorQuote(payload: VendorQuotePayload): string[] {
  const { quote } = payload;
  const lines: string[] = [];
  if (quote.availability !== "unclear") {
    lines.push(
      quote.availability === "available"
        ? "Says your date is available"
        : "Says your date is NOT available",
    );
  }
  if (quote.price !== null) {
    const basis = quote.priceBasis ? ` (${BASIS_LABEL[quote.priceBasis]})` : "";
    lines.push(`Price: ${money(quote.price)}${basis}`);
  }
  if (quote.deposit !== null) lines.push(`Deposit: ${money(quote.deposit)}`);
  if (quote.inclusions.length > 0) {
    lines.push(`Includes: ${quote.inclusions.join(", ")}`);
  }
  if (quote.conditions) lines.push(quote.conditions);
  for (const question of quote.questionsForCouple) {
    lines.push(`They asked: ${question}`);
  }
  return lines;
}

/** AGENTIC-05 — checklist replan: new due dates and new tasks, applied on approval. */
export const MAX_REPLAN_CHANGES = 15;

export type ReplanChange =
  | {
      op: "set_due";
      taskId: string;
      title: string;
      from: string | null;
      to: string;
    }
  | { op: "add_task"; title: string; due: string };

export type ChecklistReplanPayload = { changes: ReplanChange[] };

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const check = new Date(y!, m! - 1, d!);
  return (
    check.getFullYear() === y && check.getMonth() === m! - 1 && check.getDate() === d
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function prettyDate(iso: string | null): string {
  if (!iso) return "no date";
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}

export function describeReplanChange(change: ReplanChange): string {
  return change.op === "set_due"
    ? `${change.title}: ${prettyDate(change.from)} → ${prettyDate(change.to)}`
    : `Add task: ${change.title} (due ${prettyDate(change.due)})`;
}

export type CreateReplanProposalResult =
  | { ok: true; proposalId: string; changeCount: number }
  | { ok: false; error: string };

/** Validate against live tasks and queue a proposal. Writes nothing to tasks. */
export async function createReplanProposal(
  projectId: string,
  input: { title: string; summary?: string; changes: unknown },
  client?: SupabaseClient,
): Promise<CreateReplanProposalResult> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: "title is required." };
  if (!Array.isArray(input.changes) || input.changes.length === 0) {
    return { ok: false, error: "changes must be a non-empty list." };
  }
  if (input.changes.length > MAX_REPLAN_CHANGES) {
    return { ok: false, error: `Propose at most ${MAX_REPLAN_CHANGES} changes at a time.` };
  }

  const supabase = await clientForWrite(client);
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, account_id, wedding_date")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) return { ok: false, error: projectError.message };
  if (!project) return { ok: false, error: "Project not found." };

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, status, due_date")
    .eq("project_id", projectId);
  if (tasksError) return { ok: false, error: tasksError.message };
  const byId = new Map((tasks ?? []).map((t) => [t.id as string, t]));
  const existingTitles = new Set(
    (tasks ?? []).map((t) => String(t.title).trim().toLowerCase()),
  );

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const weddingDate = (project.wedding_date as string | null) ?? null;

  function checkDate(value: string | undefined): string | { error: string } {
    const date = value?.trim() ?? "";
    if (!isRealDate(date)) return { error: "due_date must be a real YYYY-MM-DD date." };
    if (date < todayIso) return { error: "Due dates must be today or later." };
    if (weddingDate && date > weddingDate) {
      return { error: "Due dates can't be after the wedding date." };
    }
    return date;
  }

  const changes: ReplanChange[] = [];
  const touched = new Set<string>();
  const newTitles = new Set<string>();

  for (const raw of input.changes as RawChange[]) {
    const op = str(raw?.op);
    const dueResult = checkDate(str(raw?.due_date));
    if (typeof dueResult !== "string") return { ok: false, error: dueResult.error };

    if (op === "set_due") {
      const taskId = str(raw.task_id)?.trim();
      if (!taskId || !UUID_RE.test(taskId)) {
        return { ok: false, error: "set_due needs a valid task_id from get_checklist." };
      }
      const task = byId.get(taskId);
      if (!task) return { ok: false, error: `Task ${taskId} is not on this project.` };
      if (task.status === "done") {
        return { ok: false, error: `"${task.title}" is already done; leave it alone.` };
      }
      if (touched.has(taskId)) {
        return { ok: false, error: "Each task can change only once." };
      }
      if (task.due_date === dueResult) {
        return { ok: false, error: `"${task.title}" already has that due date.` };
      }
      touched.add(taskId);
      changes.push({
        op: "set_due",
        taskId,
        title: String(task.title),
        from: (task.due_date as string | null) ?? null,
        to: dueResult,
      });
    } else if (op === "add_task") {
      const taskTitle = str(raw.title)?.trim();
      if (!taskTitle || taskTitle.length > 200) {
        return { ok: false, error: "add_task needs a title under 200 characters." };
      }
      const key = taskTitle.toLowerCase();
      if (existingTitles.has(key) || newTitles.has(key)) {
        return { ok: false, error: `A task named "${taskTitle}" already exists.` };
      }
      newTitles.add(key);
      changes.push({ op: "add_task", title: taskTitle, due: dueResult });
    } else {
      return { ok: false, error: "Each change op must be set_due or add_task." };
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload: ChecklistReplanPayload = { changes };
  const { data: inserted, error: insertError } = await supabase
    .from("assistant_proposals")
    .insert({
      account_id: project.account_id,
      project_id: projectId,
      kind: "checklist_replan",
      title,
      summary: input.summary?.trim() || null,
      payload,
      status: "pending",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (insertError || !inserted) {
    return { ok: false, error: insertError?.message ?? "Could not save the proposal." };
  }
  return { ok: true, proposalId: inserted.id, changeCount: changes.length };
}
