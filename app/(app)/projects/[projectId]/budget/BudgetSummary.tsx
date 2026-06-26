"use client";

import { useEffect, useState, useTransition } from "react";
import { setBudgetTarget } from "./actions";
import { formatCurrency } from "./types";
import { Card } from "@/components/ui/card";
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
    <Card className={cn("p-6", isPending && "opacity-60")}>
      <dl className="mb-4 grid gap-6 sm:grid-cols-3">
        <div>
          <dt className="text-[13px] text-ink-muted">Target</dt>
          <dd className="mt-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] font-medium text-ink-muted">$</span>
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
                className="w-full min-w-0 bg-transparent text-[22px] font-medium tabular-nums text-ink outline-none placeholder:text-ink-muted"
              />
            </div>
          </dd>
        </div>
        <div>
          <dt className="text-[13px] text-ink-muted">Allocated</dt>
          <dd className="mt-1 text-[22px] font-medium tabular-nums text-ink">
            {formatCurrency(allocated)}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] text-ink-muted">Remaining</dt>
          <dd
            className={cn(
              "mt-1 text-[22px] font-medium tabular-nums",
              overBudget ? "text-rosewood" : "text-ink",
            )}
          >
            {remaining !== null ? formatCurrency(remaining) : "—"}
          </dd>
        </div>
      </dl>

      {target !== null && target > 0 ? (
        <div className="h-2 overflow-hidden rounded-full bg-stone">
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
    </Card>
  );
}
