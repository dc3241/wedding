"use client";

import { useEffect, useState, useTransition } from "react";
import { AskAssistantLink } from "@/components/assistant/AskAssistantLink";
import { ASSISTANT_PREFILLS } from "@/components/assistant/prefills";
import { setBudgetTarget } from "./actions";
import { formatCurrency } from "./types";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";

export function BudgetSummary({
  projectId,
  target,
  allocated,
}: {
  projectId: string;
  target: number | null;
  allocated: number;
}) {
  const [targetInput, setTargetInput] = useState(
    target !== null ? String(target) : "",
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTargetInput(target !== null ? String(target) : "");
  }, [target]);

  const remaining = target !== null ? target - allocated : null;
  const overBudget = remaining !== null && remaining < 0;
  const progressPct =
    target !== null && target > 0
      ? Math.min(100, (allocated / target) * 100)
      : 0;

  function saveTarget() {
    const trimmed = targetInput.trim();

    if (!trimmed) {
      if (target === null) return;
      startTransition(async () => {
        await setBudgetTarget(projectId, null);
      });
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || parsed < 0) {
      setTargetInput(target !== null ? String(target) : "");
      return;
    }

    if (target !== null && parsed === target) return;

    startTransition(async () => {
      await setBudgetTarget(projectId, parsed);
    });
  }

  return (
    <Card className={cn("px-[34px] py-[30px]", isPending && "opacity-60")}>
      <dl className="mb-6 grid gap-6 sm:grid-cols-3">
        <div>
          <Eyebrow className="mb-2.5 block">Target</Eyebrow>
          <dd>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[42px] leading-none tracking-[-0.01em] text-ink-muted">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onBlur={saveTarget}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder="0"
                aria-label="Budget target"
                className="font-display w-full min-w-0 bg-transparent text-[42px] leading-none tracking-[-0.01em] tabular-nums text-ink outline-none placeholder:text-ink-muted"
              />
            </div>
          </dd>
        </div>
        <div>
          <Eyebrow className="mb-2.5 block">Allocated</Eyebrow>
          <dd className="font-display text-[42px] leading-none tracking-[-0.01em] tabular-nums text-plum">
            {formatCurrency(allocated)}
          </dd>
        </div>
        <div>
          <Eyebrow className="mb-2.5 block">Remaining</Eyebrow>
          <dd
            className={cn(
              "font-display text-[42px] leading-none tracking-[-0.01em] tabular-nums",
              overBudget ? "text-rosewood" : "text-ink-muted",
            )}
          >
            {remaining !== null ? formatCurrency(remaining) : "—"}
          </dd>
        </div>
      </dl>

      {target !== null && target > 0 ? (
        <div className="h-2 overflow-hidden rounded-full bg-stone-soft">
          <div
            className="h-full rounded-full bg-plum transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      ) : null}

      {overBudget && remaining !== null ? (
        <p className="mt-2 text-[13px] tabular-nums text-rosewood">
          {formatCurrency(Math.abs(remaining))} over target
        </p>
      ) : null}

      {allocated === 0 ? (
        <p className="mt-4 text-[13px] text-ink-muted">
          Nothing allocated yet.{" "}
          <AskAssistantLink prefill={ASSISTANT_PREFILLS.budget}>
            Ask assistant to estimate your budget
          </AskAssistantLink>
        </p>
      ) : null}
    </Card>
  );
}
