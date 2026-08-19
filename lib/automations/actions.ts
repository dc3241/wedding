"use server";

import { revalidatePath } from "next/cache";
import {
  AUTOMATION_ACTION_KINDS,
  AUTOMATION_TRIGGER_KINDS,
  type AddAutomationStepInput,
  type AutomationActionKind,
  type AutomationMutationResult,
  type AutomationTriggerKind,
  type AutomationWriteResult,
  type CreateAutomationWorkflowInput,
  type JsonObject,
  type ReorderAutomationStepItem,
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

  revalidatePath(AUTOMATIONS_PATH);
  return { ok: true, id: data.id };
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

  revalidatePath(AUTOMATIONS_PATH);
  return { ok: true };
}

export async function deleteAutomationWorkflow(
  id: string,
): Promise<AutomationWriteResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("automation_workflows")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(AUTOMATIONS_PATH);
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

  revalidatePath(AUTOMATIONS_PATH);
  return { ok: true, id: data.id };
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
  return { ok: true };
}

export async function deleteAutomationStep(
  id: string,
): Promise<AutomationWriteResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("automation_steps")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(AUTOMATIONS_PATH);
  return { ok: true };
}
