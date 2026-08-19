"use server";

import { revalidatePath } from "next/cache";
import {
  AUTOMATION_ACTION_KINDS,
  AUTOMATION_TRIGGER_KINDS,
  type AddAutomationStepInput,
  type AutomationActionKind,
  type AutomationMutationResult,
  type AutomationRunSummary,
  type AutomationStepRow,
  type AutomationTriggerKind,
  type AutomationWorkflowDetail,
  type AutomationWorkflowListItem,
  type AutomationWriteResult,
  type CreateAutomationWorkflowInput,
  type JsonObject,
  type ReorderAutomationStepItem,
  type UpdateAutomationStepFields,
  type UpdateAutomationWorkflowFields,
} from "@/lib/automations/types";
import { createClient } from "@/utils/supabase/server";

const AUTOMATIONS_PATH = "/automations";

function isTriggerKind(value: string): value is AutomationTriggerKind {
  return (AUTOMATION_TRIGGER_KINDS as readonly string[]).includes(value);
}

function isActionKind(value: string): value is AutomationActionKind {
  return (AUTOMATION_ACTION_KINDS as readonly string[]).includes(value);
}

function asConfig(value: JsonObject | undefined): JsonObject {
  return value ?? {};
}

function revalidateWorkflow(id?: string) {
  revalidatePath(AUTOMATIONS_PATH);
  if (id) revalidatePath(`${AUTOMATIONS_PATH}/${id}`);
}

function nestedCount(
  value: { count: number }[] | { count: number } | null | undefined,
): number {
  if (!value) return 0;
  const row = Array.isArray(value) ? value[0] : value;
  return typeof row?.count === "number" ? row.count : 0;
}

function asJsonObject(value: unknown): JsonObject {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

export async function createAutomationWorkflow(
  accountId: string,
  input: CreateAutomationWorkflowInput,
): Promise<AutomationMutationResult> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Name is required." };
  }
  if (!isTriggerKind(input.trigger_kind)) {
    return { ok: false, error: "Invalid trigger." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automation_workflows")
    .insert({
      account_id: accountId,
      name,
      trigger_kind: input.trigger_kind,
      trigger_config: asConfig(input.trigger_config),
      enabled: input.enabled ?? true,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't create workflow." };
  }

  revalidateWorkflow(data.id);
  return { ok: true, id: data.id };
}

export async function listAutomationWorkflows(
  accountId: string,
): Promise<AutomationWorkflowListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automation_workflows")
    .select(
      "id, name, trigger_kind, trigger_config, enabled, updated_at, automation_steps(count), automation_runs(count)",
    )
    .eq("account_id", accountId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    trigger_kind: row.trigger_kind,
    trigger_config: asJsonObject(row.trigger_config),
    enabled: Boolean(row.enabled),
    updated_at: row.updated_at,
    step_count: nestedCount(
      row.automation_steps as { count: number }[] | { count: number } | null,
    ),
    run_count: nestedCount(
      row.automation_runs as { count: number }[] | { count: number } | null,
    ),
  }));
}

export async function getAutomationWorkflow(
  id: string,
): Promise<{ ok: true; workflow: AutomationWorkflowDetail } | { ok: false }> {
  const supabase = await createClient();
  const { data: workflow, error: workflowError } = await supabase
    .from("automation_workflows")
    .select("id, account_id, name, trigger_kind, trigger_config, enabled")
    .eq("id", id)
    .maybeSingle();

  if (workflowError || !workflow) {
    return { ok: false };
  }

  const [
    { data: stepRows, error: stepsError },
    { data: runRows, error: runsError },
  ] = await Promise.all([
    supabase
      .from("automation_steps")
      .select(
        "id, workflow_id, position, action_kind, action_config, delay_days",
      )
      .eq("workflow_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("automation_runs")
      .select(
        "id, status, target_kind, target_id, started_at, completed_at, created_at",
      )
      .eq("workflow_id", id)
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  if (stepsError || runsError) {
    return { ok: false };
  }

  return {
    ok: true,
    workflow: {
      id: workflow.id,
      account_id: workflow.account_id,
      name: workflow.name,
      trigger_kind: workflow.trigger_kind,
      trigger_config: asJsonObject(workflow.trigger_config),
      enabled: Boolean(workflow.enabled),
      steps: ((stepRows ?? []) as AutomationStepRow[]).map((step) => ({
        ...step,
        action_config: asJsonObject(step.action_config),
      })),
      runs: (runRows ?? []) as AutomationRunSummary[],
    },
  };
}

export async function updateAutomationWorkflow(
  id: string,
  fields: UpdateAutomationWorkflowFields,
): Promise<AutomationWriteResult> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (fields.name !== undefined) {
    const name = fields.name.trim();
    if (!name) {
      return { ok: false, error: "Name is required." };
    }
    payload.name = name;
  }
  if (fields.trigger_kind !== undefined) {
    if (!isTriggerKind(fields.trigger_kind)) {
      return { ok: false, error: "Invalid trigger." };
    }
    payload.trigger_kind = fields.trigger_kind;
  }
  if (fields.trigger_config !== undefined) {
    payload.trigger_config = fields.trigger_config;
  }
  if (fields.enabled !== undefined) {
    payload.enabled = fields.enabled;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("automation_workflows")
    .update(payload)
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateWorkflow(id);
  return { ok: true };
}

export async function deleteAutomationWorkflow(
  id: string,
): Promise<AutomationWriteResult> {
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("automation_runs")
    .select("id", { count: "exact", head: true })
    .eq("workflow_id", id);

  if (countError) {
    return { ok: false, error: countError.message };
  }
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "This workflow has run history — disable it instead.",
    };
  }

  const { error } = await supabase
    .from("automation_workflows")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateWorkflow(id);
  return { ok: true };
}

export async function addAutomationStep(
  workflowId: string,
  input: AddAutomationStepInput,
): Promise<AutomationMutationResult> {
  if (!isActionKind(input.action_kind)) {
    return { ok: false, error: "Invalid action." };
  }

  const delayDays = input.delay_days ?? 0;
  if (!Number.isInteger(delayDays) || delayDays < 0) {
    return { ok: false, error: "Delay must be zero or more days." };
  }

  const supabase = await createClient();

  let position = input.position;
  if (position === undefined) {
    const { data: last, error: lastError } = await supabase
      .from("automation_steps")
      .select("position")
      .eq("workflow_id", workflowId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastError) {
      return { ok: false, error: lastError.message };
    }
    position = last ? last.position + 1 : 0;
  } else if (!Number.isInteger(position)) {
    return { ok: false, error: "Invalid position." };
  }

  const { data, error } = await supabase
    .from("automation_steps")
    .insert({
      workflow_id: workflowId,
      position,
      action_kind: input.action_kind,
      action_config: asConfig(input.action_config),
      delay_days: delayDays,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Couldn't add step." };
  }

  revalidateWorkflow(workflowId);
  return { ok: true, id: data.id };
}

export async function updateAutomationStep(
  id: string,
  fields: UpdateAutomationStepFields,
): Promise<AutomationWriteResult> {
  const payload: Record<string, unknown> = {};

  if (fields.action_kind !== undefined) {
    if (!isActionKind(fields.action_kind)) {
      return { ok: false, error: "Invalid action." };
    }
    payload.action_kind = fields.action_kind;
  }
  if (fields.action_config !== undefined) {
    payload.action_config = fields.action_config;
  }
  if (fields.delay_days !== undefined) {
    if (!Number.isInteger(fields.delay_days) || fields.delay_days < 0) {
      return { ok: false, error: "Delay must be zero or more days." };
    }
    payload.delay_days = fields.delay_days;
  }

  if (Object.keys(payload).length === 0) {
    return { ok: true };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automation_steps")
    .update(payload)
    .eq("id", id)
    .select("workflow_id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateWorkflow(data?.workflow_id);
  return { ok: true };
}

export async function reorderAutomationSteps(
  items: ReorderAutomationStepItem[],
): Promise<AutomationWriteResult> {
  for (const item of items) {
    if (!Number.isInteger(item.position) || item.position < 0) {
      return { ok: false, error: "Invalid position." };
    }
  }

  const supabase = await createClient();
  const offset = 1_000_000;

  // Two-phase so (workflow_id, position) stays unique mid-swap.
  for (const item of items) {
    const { error } = await supabase
      .from("automation_steps")
      .update({ position: item.position + offset })
      .eq("id", item.id);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  for (const item of items) {
    const { error } = await supabase
      .from("automation_steps")
      .update({ position: item.position })
      .eq("id", item.id);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath(AUTOMATIONS_PATH);
  if (items.length > 0) {
    const { data } = await supabase
      .from("automation_steps")
      .select("workflow_id")
      .eq("id", items[0].id)
      .maybeSingle();
    if (data?.workflow_id) {
      revalidatePath(`${AUTOMATIONS_PATH}/${data.workflow_id}`);
    }
  }
  return { ok: true };
}

export async function deleteAutomationStep(
  id: string,
): Promise<AutomationWriteResult> {
  const supabase = await createClient();
  const { data, error: loadError } = await supabase
    .from("automation_steps")
    .select("workflow_id")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return { ok: false, error: loadError.message };
  }

  const { error } = await supabase
    .from("automation_steps")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateWorkflow(data?.workflow_id);
  return { ok: true };
}
