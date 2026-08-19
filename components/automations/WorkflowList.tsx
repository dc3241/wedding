"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { triggerSummary } from "@/components/automations/labels";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import {
  deleteAutomationWorkflow,
  updateAutomationWorkflow,
} from "@/lib/automations/actions";
import type { AutomationWorkflowListItem } from "@/lib/automations/types";

export function WorkflowList({
  workflows,
}: {
  workflows: AutomationWorkflowListItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleEnabled(workflow: AutomationWorkflowListItem) {
    setError(null);
    startTransition(async () => {
      const result = await updateAutomationWorkflow(workflow.id, {
        enabled: !workflow.enabled,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete(workflow: AutomationWorkflowListItem) {
    if (
      !window.confirm(
        `Delete workflow "${workflow.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteAutomationWorkflow(workflow.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (workflows.length === 0) {
    return (
      <EmptyState>
        No workflows yet. Create one to run steps when a lead changes stage.
      </EmptyState>
    );
  }

  return (
    <Card className="space-y-2 p-2">
      {error ? (
        <p className="px-3 pt-2 text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
      {workflows.map((workflow) => (
        <div
          key={workflow.id}
          className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <Link
              href={`/automations/${workflow.id}`}
              className="text-[15px] font-medium text-ink no-underline hover:text-accent"
            >
              {workflow.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
              <span>{triggerSummary(workflow.trigger_kind, workflow.trigger_config)}</span>
              <span>
                {workflow.step_count}{" "}
                {workflow.step_count === 1 ? "step" : "steps"}
              </span>
              <Link
                href={`/automations/${workflow.id}#runs`}
                className="text-muted no-underline hover:text-accent"
              >
                {workflow.run_count}{" "}
                {workflow.run_count === 1 ? "run" : "runs"}
              </Link>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={workflow.enabled}
              disabled={isPending}
              onClick={() => toggleEnabled(workflow)}
              className="rounded-[var(--radius-pill)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Pill variant={workflow.enabled ? "sage" : "default"}>
                {workflow.enabled ? "On" : "Off"}
              </Pill>
            </button>
            <Button
              type="button"
              variant="default"
              disabled={isPending}
              onClick={() => handleDelete(workflow)}
              className="px-3 py-1.5 text-[13px]"
            >
              Delete
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}
