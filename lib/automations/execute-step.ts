import "server-only";

import { addTask } from "@/app/(app)/projects/[projectId]/checklist/actions";
import { addNote, updateNote } from "@/app/(app)/projects/[projectId]/notes/actions";
import { LEAD_STAGES, type LeadStage } from "@/components/leads/types";
import type { AutomationActionKind, JsonObject } from "@/lib/automations/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StepExecution = {
  outcome: "ok" | "error";
  detail: string;
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

function composeLeadNote(
  existing: string | null,
  title: string | undefined,
  body: string | undefined,
): string | null {
  const parts = [title?.trim(), body?.trim()].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  const addition = parts.join("\n");
  const current = existing?.trim() ?? "";
  return current ? `${current}\n\n${addition}` : addition;
}

async function executeAddNote(
  client: SupabaseClient,
  leadId: string,
  config: JsonObject,
): Promise<StepExecution> {
  const title = asString(config.title);
  const body = asString(config.body);
  const projectId = asString(config.project_id)?.trim();

  if (projectId) {
    const noteId = await addNote(projectId, client);
    const fields: { title?: string; body?: string } = {};
    if (title?.trim()) fields.title = title.trim();
    if (body !== undefined) fields.body = body;
    if (Object.keys(fields).length > 0) {
      await updateNote(noteId, fields, client);
    }
    return { outcome: "ok", detail: `note ${noteId}` };
  }

  const composed = composeLeadNote(null, title, body);
  if (!composed) {
    return { outcome: "error", detail: "add_note requires title or body." };
  }

  const { data: lead, error: loadError } = await client
    .from("leads")
    .select("notes")
    .eq("id", leadId)
    .maybeSingle();

  if (loadError) {
    return { outcome: "error", detail: loadError.message };
  }
  if (!lead) {
    return { outcome: "error", detail: "Lead not found for add_note." };
  }

  const notes = composeLeadNote(lead.notes, title, body);
  const { error } = await client
    .from("leads")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", leadId);

  if (error) {
    return { outcome: "error", detail: error.message };
  }
  return { outcome: "ok", detail: "lead note written" };
}

async function executeChangeLeadStage(
  client: SupabaseClient,
  leadId: string,
  config: JsonObject,
): Promise<StepExecution> {
  const raw = asString(config.stage)?.trim() ?? asString(config.to_stage)?.trim();
  if (!raw || !isLeadStage(raw)) {
    return {
      outcome: "error",
      detail: "change_lead_stage requires a valid stage.",
    };
  }

  const { error } = await client
    .from("leads")
    .update({ stage: raw, updated_at: new Date().toISOString() })
    .eq("id", leadId);

  if (error) {
    return { outcome: "error", detail: error.message };
  }
  return { outcome: "ok", detail: `stage ${raw}` };
}

async function executeCreateTask(
  client: SupabaseClient,
  config: JsonObject,
): Promise<StepExecution> {
  const title = asString(config.title)?.trim();
  const projectId = asString(config.project_id)?.trim();
  if (!title) {
    return { outcome: "error", detail: "create_task requires title." };
  }
  if (!projectId) {
    return {
      outcome: "error",
      detail: "create_task requires project_id (tasks are project-scoped).",
    };
  }

  const dueDate = asString(config.due_date)?.trim() || null;
  const phase = asString(config.phase)?.trim() || null;
  await addTask(projectId, phase, title, dueDate, client);
  return { outcome: "ok", detail: `task ${title}` };
}

export async function executeAutomationStep(
  client: SupabaseClient,
  actionKind: AutomationActionKind,
  actionConfig: JsonObject,
  targetKind: "lead" | "project",
  targetId: string,
): Promise<StepExecution> {
  try {
    if (actionKind === "add_note") {
      if (targetKind !== "lead") {
        return {
          outcome: "error",
          detail: "add_note on a project target needs project_id in action_config.",
        };
      }
      return await executeAddNote(client, targetId, actionConfig);
    }
    if (actionKind === "change_lead_stage") {
      if (targetKind !== "lead") {
        return {
          outcome: "error",
          detail: "change_lead_stage only runs on a lead target.",
        };
      }
      return await executeChangeLeadStage(client, targetId, actionConfig);
    }
    if (actionKind === "create_task") {
      return await executeCreateTask(client, actionConfig);
    }
    return { outcome: "error", detail: `Unknown action_kind ${actionKind}` };
  } catch (err) {
    return {
      outcome: "error",
      detail: err instanceof Error ? err.message : "Step failed.",
    };
  }
}
