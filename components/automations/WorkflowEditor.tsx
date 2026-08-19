"use client";

import {
  moveArrayItem,
  ReorderButtons,
} from "@/app/(app)/projects/[projectId]/website/ReorderButtons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { ACTION_KIND_LABEL } from "@/components/automations/labels";
import {
  LEAD_STAGE_LABEL,
  LEAD_STAGES,
  type LeadStage,
} from "@/components/leads/types";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  addAutomationStep,
  createAutomationWorkflow,
  deleteAutomationStep,
  reorderAutomationSteps,
  updateAutomationStep,
  updateAutomationWorkflow,
} from "@/lib/automations/actions";
import {
  AUTOMATION_UI_ACTION_KINDS,
  WORKFLOW_EMAIL_TOKEN_CHIPS,
  type AutomationUiActionKind,
  type AutomationWorkflowDetail,
  type JsonObject,
} from "@/lib/automations/types";

type DraftStep = {
  clientId: string;
  id?: string;
  action_kind: AutomationUiActionKind;
  delay_days: number;
  title: string;
  body: string;
  stage: LeadStage;
  subject: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isUiActionKind(value: string): value is AutomationUiActionKind {
  return (AUTOMATION_UI_ACTION_KINDS as readonly string[]).includes(value);
}

function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

function newDraftStep(): DraftStep {
  return {
    clientId: crypto.randomUUID(),
    action_kind: "add_note",
    delay_days: 0,
    title: "",
    body: "",
    stage: "contacted",
    subject: "",
  };
}

function stepFromRow(
  step: AutomationWorkflowDetail["steps"][number],
): DraftStep {
  const cfg = step.action_config;
  const stageRaw = asString(cfg.stage) || asString(cfg.to_stage);
  return {
    clientId: step.id,
    id: step.id,
    action_kind: isUiActionKind(step.action_kind)
      ? step.action_kind
      : "add_note",
    delay_days: step.delay_days,
    title: asString(cfg.title),
    body: asString(cfg.body),
    stage: isLeadStage(stageRaw) ? stageRaw : "contacted",
    subject: asString(cfg.subject),
  };
}

function toStageFromConfig(config: JsonObject): string {
  const raw = config.to_stage;
  return typeof raw === "string" && isLeadStage(raw) ? raw : "";
}

function stepConfig(step: DraftStep): JsonObject {
  if (step.action_kind === "add_note") {
    const config: JsonObject = { body: step.body.trim() };
    if (step.title.trim()) config.title = step.title.trim();
    return config;
  }
  if (step.action_kind === "change_lead_stage") {
    return { stage: step.stage };
  }
  return { subject: step.subject.trim(), body: step.body.trim() };
}

function validateSteps(steps: DraftStep[]): string | null {
  for (const [index, step] of steps.entries()) {
    const n = index + 1;
    if (!Number.isInteger(step.delay_days) || step.delay_days < 0) {
      return `Step ${n}: delay must be zero or more days.`;
    }
    if (step.action_kind === "add_note" && !step.body.trim()) {
      return `Step ${n}: note body is required.`;
    }
    if (step.action_kind === "send_email") {
      if (!step.subject.trim() || !step.body.trim()) {
        return `Step ${n}: email subject and body are required.`;
      }
    }
  }
  return null;
}

function formatRunWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WorkflowEditor({
  accountId,
  initial,
}: {
  accountId: string;
  initial?: AutomationWorkflowDetail;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [toStage, setToStage] = useState(
    initial ? toStageFromConfig(initial.trigger_config) : "",
  );
  const [steps, setSteps] = useState<DraftStep[]>(
    () => initial?.steps.map(stepFromRow) ?? [newDraftStep()],
  );
  const originalStepIds = useMemo(
    () => initial?.steps.map((step) => step.id) ?? [],
    [initial],
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tokenTarget, setTokenTarget] = useState<{
    clientId: string;
    field: "subject" | "body";
  } | null>(null);
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>(
    {},
  );

  function updateStep(clientId: string, patch: Partial<DraftStep>) {
    setSteps((current) =>
      current.map((step) =>
        step.clientId === clientId ? { ...step, ...patch } : step,
      ),
    );
  }

  function insertToken(
    token: string,
    target: { clientId: string; field: "subject" | "body" },
  ) {
    const step = steps.find((item) => item.clientId === target.clientId);
    if (!step || step.action_kind !== "send_email") return;
    const key = `${target.clientId}:${target.field}`;
    const el = fieldRefs.current[key];
    const current =
      el?.value ?? (target.field === "subject" ? step.subject : step.body);
    if (!el) {
      updateStep(target.clientId, {
        [target.field]: current + token,
      });
      return;
    }
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    updateStep(target.clientId, { [target.field]: next });
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + token.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    const invalid = validateSteps(steps);
    if (invalid) {
      setError(invalid);
      return;
    }

    const triggerConfig: JsonObject = { ...initial?.trigger_config };
    if (toStage) triggerConfig.to_stage = toStage;
    else delete triggerConfig.to_stage;

    setError(null);
    startTransition(async () => {
      let workflowId = initial?.id;
      if (!workflowId) {
        const created = await createAutomationWorkflow(accountId, {
          name: trimmedName,
          trigger_kind: "lead_stage_changed",
          trigger_config: triggerConfig,
          enabled,
        });
        if (!created.ok) {
          setError(created.error);
          return;
        }
        workflowId = created.id;
      } else {
        const updated = await updateAutomationWorkflow(workflowId, {
          name: trimmedName,
          trigger_config: triggerConfig,
          enabled,
        });
        if (!updated.ok) {
          setError(updated.error);
          return;
        }
      }

      const kept = new Set(steps.map((step) => step.id).filter(Boolean));
      for (const id of originalStepIds) {
        if (!kept.has(id)) {
          const removed = await deleteAutomationStep(id);
          if (!removed.ok) {
            setError(removed.error);
            return;
          }
        }
      }

      const ordered: { id: string }[] = [];
      for (const step of steps) {
        const payload = {
          action_kind: step.action_kind,
          action_config: stepConfig(step),
          delay_days: step.delay_days,
        };
        if (step.id) {
          const updated = await updateAutomationStep(step.id, payload);
          if (!updated.ok) {
            setError(updated.error);
            return;
          }
          ordered.push({ id: step.id });
        } else {
          const added = await addAutomationStep(workflowId, payload);
          if (!added.ok) {
            setError(added.error);
            return;
          }
          ordered.push({ id: added.id });
        }
      }

      if (ordered.length > 0) {
        const reordered = await reorderAutomationSteps(
          ordered.map((item, position) => ({ id: item.id, position })),
        );
        if (!reordered.ok) {
          setError(reordered.error);
          return;
        }
      }

      router.push(`/automations/${workflowId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-muted">
        <Link href="/automations" className="text-accent no-underline hover:underline">
          ← Back to automations
        </Link>
      </p>

      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            {initial ? "Edit workflow" : "New workflow"}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Runs when a lead moves stages. Email steps draft for your approval —
            they never send on their own.
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-muted">Name</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isPending}
            placeholder="Follow up after inquiry"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">Trigger</span>
            <Select value="lead_stage_changed" disabled>
              <option value="lead_stage_changed">Lead stage changed</option>
            </Select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-muted">
              Only when moving to
            </span>
            <Select
              value={toStage}
              onChange={(event) => setToStage(event.target.value)}
              disabled={isPending}
            >
              <option value="">Any stage</option>
              {LEAD_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {LEAD_STAGE_LABEL[stage]}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <label className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            disabled={isPending}
            className="size-4 rounded border-ring text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          Enabled
        </label>
      </Card>

      <Card className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Steps
          </h2>
          <Button
            type="button"
            variant="default"
            disabled={isPending}
            onClick={() => setSteps((current) => [...current, newDraftStep()])}
            className="px-3 py-1.5 text-[13px]"
          >
            Add step
          </Button>
        </div>

        {steps.length === 0 ? (
          <p className="rounded-[var(--radius-inner)] bg-well px-4 py-6 text-center text-[13px] text-muted shadow-recessed">
            No steps yet. Add one to do something when the trigger fires.
          </p>
        ) : (
          <ol className="space-y-3">
            {steps.map((step, index) => (
              <li
                key={step.clientId}
                className="space-y-3 rounded-[var(--radius-inner)] bg-well px-4 py-4 shadow-recessed"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
                    Step {index + 1}
                  </p>
                  <div className="flex items-center gap-2">
                    <ReorderButtons
                      index={index}
                      total={steps.length}
                      disabled={isPending}
                      label={`step ${index + 1}`}
                      onMove={(from, to) =>
                        setSteps((current) => moveArrayItem(current, from, to))
                      }
                    />
                    <Button
                      type="button"
                      variant="default"
                      disabled={isPending}
                      onClick={() =>
                        setSteps((current) =>
                          current.filter(
                            (item) => item.clientId !== step.clientId,
                          ),
                        )
                      }
                      className="px-3 py-1.5 text-[13px]"
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-muted">
                      Action
                    </span>
                    <Select
                      value={step.action_kind}
                      disabled={isPending}
                      onChange={(event) =>
                        updateStep(step.clientId, {
                          action_kind: event.target
                            .value as AutomationUiActionKind,
                        })
                      }
                    >
                      {AUTOMATION_UI_ACTION_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {ACTION_KIND_LABEL[kind]}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-muted">
                      Delay (days)
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={step.delay_days}
                      disabled={isPending}
                      onChange={(event) => {
                        const parsed = Number.parseInt(event.target.value, 10);
                        updateStep(step.clientId, {
                          delay_days:
                            Number.isInteger(parsed) && parsed >= 0
                              ? parsed
                              : 0,
                        });
                      }}
                    />
                  </label>
                </div>

                {step.action_kind === "add_note" ? (
                  <>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-medium text-muted">
                        Title (optional)
                      </span>
                      <Input
                        value={step.title}
                        disabled={isPending}
                        onChange={(event) =>
                          updateStep(step.clientId, { title: event.target.value })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-medium text-muted">
                        Body
                      </span>
                      <Textarea
                        rows={4}
                        value={step.body}
                        disabled={isPending}
                        onChange={(event) =>
                          updateStep(step.clientId, { body: event.target.value })
                        }
                      />
                    </label>
                  </>
                ) : null}

                {step.action_kind === "change_lead_stage" ? (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-muted">
                      Move lead to
                    </span>
                    <Select
                      value={step.stage}
                      disabled={isPending}
                      onChange={(event) =>
                        updateStep(step.clientId, {
                          stage: event.target.value as LeadStage,
                        })
                      }
                    >
                      {LEAD_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {LEAD_STAGE_LABEL[stage]}
                        </option>
                      ))}
                    </Select>
                  </label>
                ) : null}

                {step.action_kind === "send_email" ? (
                  <>
                    <p className="text-[13px] text-muted">
                      Insert a token to fill from the lead when this runs.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {WORKFLOW_EMAIL_TOKEN_CHIPS.map(({ token, label }) => (
                        <button
                          key={token}
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            const target =
                              tokenTarget?.clientId === step.clientId
                                ? tokenTarget
                                : {
                                    clientId: step.clientId,
                                    field: "body" as const,
                                  };
                            setTokenTarget(target);
                            insertToken(token, target);
                          }}
                          className="cursor-pointer rounded-[var(--radius-pill)] border border-ring bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                          title={token}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-medium text-muted">
                        Subject
                      </span>
                      <Input
                        value={step.subject}
                        disabled={isPending}
                        onFocus={() =>
                          setTokenTarget({
                            clientId: step.clientId,
                            field: "subject",
                          })
                        }
                        onChange={(event) =>
                          updateStep(step.clientId, {
                            subject: event.target.value,
                          })
                        }
                        ref={(el) => {
                          fieldRefs.current[`${step.clientId}:subject`] = el;
                        }}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[13px] font-medium text-muted">
                        Body
                      </span>
                      <Textarea
                        rows={6}
                        value={step.body}
                        disabled={isPending}
                        onFocus={() =>
                          setTokenTarget({
                            clientId: step.clientId,
                            field: "body",
                          })
                        }
                        onChange={(event) =>
                          updateStep(step.clientId, { body: event.target.value })
                        }
                        ref={(el) => {
                          fieldRefs.current[`${step.clientId}:body`] = el;
                        }}
                      />
                    </label>
                  </>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Card>

      {initial && initial.runs.length > 0 ? (
        <Card id="runs" className="space-y-3 p-5 sm:p-6 scroll-mt-24">
          <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Runs
          </h2>
          <ul className="space-y-2">
            {initial.runs.map((run) => (
              <li
                key={run.id}
                className="rounded-[var(--radius-inner)] bg-well px-4 py-3 text-[13px] shadow-recessed"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium capitalize text-ink">
                    {run.status}
                  </span>
                  <span className="tabular-nums text-muted">
                    {formatRunWhen(run.started_at ?? run.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-muted">
                  {run.target_kind} {run.target_id.slice(0, 8)}…
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : initial ? (
        <p id="runs" className="scroll-mt-24 text-[13px] text-muted">
          No runs yet.
        </p>
      ) : null}

      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={isPending} onClick={handleSave}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        <ButtonLink href="/automations" variant="default">
          Cancel
        </ButtonLink>
      </div>
    </div>
  );
}
