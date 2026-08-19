import "server-only";

import { executeAutomationStep } from "@/lib/automations/execute-step";
import type {
  AutomationActionKind,
  AutomationTriggerKind,
  JsonObject,
} from "@/lib/automations/types";
import {
  mintUnattendedWriteSession,
  resolveUnattendedActorUserId,
} from "@/lib/assistant/unattended-write-session";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { revalidatePath } from "next/cache";

const LEADS_PATH = "/leads";
const DAY_MS = 24 * 60 * 60 * 1000;

export type LeadAutomationEvent = {
  accountId: string;
  leadId: string;
  triggerKind: Extract<
    AutomationTriggerKind,
    "lead_stage_changed" | "lead_created"
  >;
  fromStage?: string | null;
  toStage?: string | null;
};

type WorkflowRow = {
  id: string;
  account_id: string;
  trigger_kind: string;
  trigger_config: JsonObject | null;
  enabled: boolean;
};

type StepRow = {
  id: string;
  position: number;
  action_kind: string;
  action_config: JsonObject | null;
  delay_days: number;
};

function asConfig(value: JsonObject | null | undefined): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function triggerMatches(
  workflow: WorkflowRow,
  event: LeadAutomationEvent,
): boolean {
  const cfg = asConfig(workflow.trigger_config);
  if (event.triggerKind === "lead_stage_changed") {
    const fromStage =
      typeof cfg.from_stage === "string" ? cfg.from_stage : null;
    const toStage = typeof cfg.to_stage === "string" ? cfg.to_stage : null;
    if (fromStage && fromStage !== event.fromStage) return false;
    if (toStage && toStage !== event.toStage) return false;
  }
  return true;
}

async function writeRunLog(
  admin: ReturnType<typeof createServiceRoleClient>,
  runId: string,
  stepId: string | null,
  outcome: "ok" | "error" | "skipped",
  detail: string,
) {
  const { error } = await admin.from("automation_run_log").insert({
    run_id: runId,
    step_id: stepId,
    executed_at: new Date().toISOString(),
    outcome,
    detail,
  });
  if (error) {
    console.error("automation_run_log insert:", error.message);
  }
}

async function runWorkflow(
  admin: ReturnType<typeof createServiceRoleClient>,
  workflow: WorkflowRow,
  event: LeadAutomationEvent,
) {
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await admin
    .from("automation_runs")
    .insert({
      workflow_id: workflow.id,
      account_id: event.accountId,
      target_kind: "lead",
      target_id: event.leadId,
      current_step_position: 0,
      status: "running",
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (runError || !run) {
    throw new Error(runError?.message ?? "Couldn't create automation run.");
  }

  const runId = run.id as string;

  try {
    const { data: stepRows, error: stepsError } = await admin
      .from("automation_steps")
      .select("id, position, action_kind, action_config, delay_days")
      .eq("workflow_id", workflow.id)
      .order("position", { ascending: true });

    if (stepsError) {
      throw new Error(stepsError.message);
    }

    const steps = (stepRows ?? []) as StepRow[];
    if (steps.length === 0) {
      await admin
        .from("automation_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
      return;
    }

    const userId = await resolveUnattendedActorUserId(event.accountId, admin);
    const session = await mintUnattendedWriteSession(userId);

    for (const step of steps) {
      if (step.delay_days > 0) {
        const nextDue = new Date(
          Date.now() + step.delay_days * DAY_MS,
        ).toISOString();
        await admin
          .from("automation_runs")
          .update({
            status: "pending",
            current_step_position: step.position,
            next_due_at: nextDue,
          })
          .eq("id", runId);
        return;
      }

      const result = await executeAutomationStep(
        session.client,
        step.action_kind as AutomationActionKind,
        asConfig(step.action_config),
        "lead",
        event.leadId,
      );

      await writeRunLog(admin, runId, step.id, result.outcome, result.detail);

      if (result.outcome === "error") {
        await admin
          .from("automation_runs")
          .update({
            status: "failed",
            current_step_position: step.position,
            completed_at: new Date().toISOString(),
          })
          .eq("id", runId);
        return;
      }

      await admin
        .from("automation_runs")
        .update({ current_step_position: step.position })
        .eq("id", runId);
    }

    await admin
      .from("automation_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        current_step_position: steps[steps.length - 1].position,
      })
      .eq("id", runId);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Run failed.";
    await writeRunLog(admin, runId, null, "error", detail);
    await admin
      .from("automation_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
  }
}

/**
 * Fire matching enabled workflows for a lead event. Never throws —
 * automation failure must not fail the underlying lead mutation.
 */
export async function dispatchLeadAutomation(
  event: LeadAutomationEvent,
): Promise<void> {
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin
      .from("automation_workflows")
      .select("id, account_id, trigger_kind, trigger_config, enabled")
      .eq("account_id", event.accountId)
      .eq("enabled", true)
      .eq("trigger_kind", event.triggerKind);

    if (error) {
      throw new Error(error.message);
    }

    const workflows = ((data ?? []) as WorkflowRow[]).filter((workflow) =>
      triggerMatches(workflow, event),
    );

    for (const workflow of workflows) {
      try {
        await runWorkflow(admin, workflow, event);
      } catch (err) {
        console.error(
          `automation workflow ${workflow.id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    if (workflows.length > 0) {
      revalidatePath(LEADS_PATH);
    }
  } catch (err) {
    console.error(
      "dispatchLeadAutomation:",
      err instanceof Error ? err.message : err,
    );
  }
}
