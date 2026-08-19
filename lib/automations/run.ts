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
  type UnattendedWriteSession,
} from "@/lib/assistant/unattended-write-session";
import { createServiceRoleClient } from "@/utils/supabase/service-role";
import { revalidatePath } from "next/cache";

const LEADS_PATH = "/leads";
const DAY_MS = 24 * 60 * 60 * 1000;
/** Match AUTO-03b's per-invocation cap (inquiry scan uses 8; delay resume is cheaper). */
export const AUTOMATION_RUNS_PER_INVOCATION = 20;

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

type AdminClient = ReturnType<typeof createServiceRoleClient>;

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

type RunRow = {
  id: string;
  workflow_id: string;
  account_id: string;
  target_kind: "lead" | "project";
  target_id: string;
  current_step_position: number | null;
};

export type AdvanceOutcome = "completed" | "pending" | "failed";

export type DueDispatchResult = {
  scanned: number;
  resumed: number;
  completed: number;
  halted: number;
  failed: number;
  errors: string[];
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
  admin: AdminClient,
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

function delayDueAt(delayDays: number): string {
  return new Date(Date.now() + delayDays * DAY_MS).toISOString();
}

/**
 * Walk steps for a run.
 *
 * current_step_position:
 *   - After a successful execute: the step just completed.
 *   - On delay halt: the delayed step that has NOT run yet (next to run).
 *
 * mode "start": honor delay_days on every step, including the first.
 * mode "resume": the step at current_step_position is due (delay already
 * elapsed) — execute it; honor delay_days on later steps only.
 */
export async function advanceAutomationRun(
  admin: AdminClient,
  run: RunRow,
  mode: "start" | "resume",
): Promise<AdvanceOutcome> {
  try {
    const { data: stepRows, error: stepsError } = await admin
      .from("automation_steps")
      .select("id, position, action_kind, action_config, delay_days")
      .eq("workflow_id", run.workflow_id)
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
          next_due_at: null,
        })
        .eq("id", run.id);
      return "completed";
    }

    const resumeFrom =
      mode === "resume" ? (run.current_step_position ?? 0) : Number.NEGATIVE_INFINITY;
    const remaining = steps.filter((step) => step.position >= resumeFrom);

    if (remaining.length === 0) {
      await admin
        .from("automation_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          current_step_position: steps[steps.length - 1].position,
          next_due_at: null,
        })
        .eq("id", run.id);
      return "completed";
    }

    if (mode === "resume" && run.target_kind === "lead") {
      const { data: lead, error: leadError } = await admin
        .from("leads")
        .select("id")
        .eq("id", run.target_id)
        .maybeSingle();
      if (leadError) {
        throw new Error(leadError.message);
      }
      if (!lead) {
        await writeRunLog(
          admin,
          run.id,
          null,
          "error",
          "Lead no longer exists.",
        );
        await admin
          .from("automation_runs")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            next_due_at: null,
          })
          .eq("id", run.id);
        return "failed";
      }
    }

    let session: UnattendedWriteSession | null = null;
    async function writeClient() {
      if (!session) {
        const userId = await resolveUnattendedActorUserId(
          run.account_id,
          admin,
        );
        session = await mintUnattendedWriteSession(userId);
      }
      return session.client;
    }

    let firstRemaining = true;
    for (const step of remaining) {
      const delayAlreadyElapsed = mode === "resume" && firstRemaining;
      firstRemaining = false;

      if (step.delay_days > 0 && !delayAlreadyElapsed) {
        await admin
          .from("automation_runs")
          .update({
            status: "pending",
            current_step_position: step.position,
            next_due_at: delayDueAt(step.delay_days),
          })
          .eq("id", run.id);
        return "pending";
      }

      const result = await executeAutomationStep(
        await writeClient(),
        step.action_kind as AutomationActionKind,
        asConfig(step.action_config),
        run.target_kind,
        run.target_id,
      );

      await writeRunLog(admin, run.id, step.id, result.outcome, result.detail);

      if (result.outcome === "error") {
        await admin
          .from("automation_runs")
          .update({
            status: "failed",
            current_step_position: step.position,
            completed_at: new Date().toISOString(),
            next_due_at: null,
          })
          .eq("id", run.id);
        return "failed";
      }

      await admin
        .from("automation_runs")
        .update({ current_step_position: step.position, next_due_at: null })
        .eq("id", run.id);
    }

    await admin
      .from("automation_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        current_step_position: remaining[remaining.length - 1].position,
        next_due_at: null,
      })
      .eq("id", run.id);
    return "completed";
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Run failed.";
    await writeRunLog(admin, run.id, null, "error", detail);
    await admin
      .from("automation_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        next_due_at: null,
      })
      .eq("id", run.id);
    return "failed";
  }
}

async function runWorkflow(
  admin: AdminClient,
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

  await advanceAutomationRun(
    admin,
    {
      id: run.id as string,
      workflow_id: workflow.id,
      account_id: event.accountId,
      target_kind: "lead",
      target_id: event.leadId,
      current_step_position: 0,
    },
    "start",
  );
}

/**
 * Resume pending runs whose delay has elapsed.
 * Safe no-op when nothing is due. One failed target does not abort the batch.
 */
export async function dispatchDueAutomationRuns(
  admin: AdminClient = createServiceRoleClient(),
): Promise<DueDispatchResult> {
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("automation_runs")
    .select(
      "id, workflow_id, account_id, target_kind, target_id, current_step_position",
    )
    .eq("status", "pending")
    .lte("next_due_at", nowIso)
    .order("next_due_at", { ascending: true })
    .limit(AUTOMATION_RUNS_PER_INVOCATION);

  if (error) {
    throw new Error(error.message);
  }

  const due = (data ?? []) as RunRow[];
  const result: DueDispatchResult = {
    scanned: due.length,
    resumed: 0,
    completed: 0,
    halted: 0,
    failed: 0,
    errors: [],
  };

  for (const run of due) {
    try {
      const { data: claimed, error: claimError } = await admin
        .from("automation_runs")
        .update({ status: "running" })
        .eq("id", run.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();

      if (claimError) {
        throw new Error(claimError.message);
      }
      if (!claimed) {
        continue;
      }

      result.resumed += 1;
      const outcome = await advanceAutomationRun(admin, run, "resume");
      if (outcome === "completed") result.completed += 1;
      else if (outcome === "pending") result.halted += 1;
      else result.failed += 1;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Dispatch failed.";
      result.failed += 1;
      result.errors.push(`run ${run.id}: ${detail}`);
      await writeRunLog(admin, run.id, null, "error", detail);
      await admin
        .from("automation_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          next_due_at: null,
        })
        .eq("id", run.id);
    }
  }

  return result;
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
