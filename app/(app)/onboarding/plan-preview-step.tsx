"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { commitPlan, generatePlan } from "./plan-actions";
import type { WeddingPlan } from "./plan-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

const PHASE_OPTIONS = [
  "12+ months",
  "9 months",
  "6 months",
  "3 months",
  "1 month",
  "week of",
] as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDueDate(date: string | null) {
  if (!date) return "No date";
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type PlanPreviewStepProps = {
  projectId: string;
  onBack: () => void;
};

export function PlanPreviewStep({ projectId, onBack }: PlanPreviewStepProps) {
  const [plan, setPlan] = useState<WeddingPlan | null>(null);
  const [budgetTarget, setBudgetTarget] = useState<number | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadPlan = useCallback((options?: { replace?: boolean }) => {
    setGenLoading(true);
    setGenError(null);
    if (options?.replace) {
      setPlan(null);
    }

    startTransition(async () => {
      const result = await generatePlan(projectId);
      setGenLoading(false);
      setHasLoaded(true);

      if (result.ok) {
        setPlan(result.plan);
        setBudgetTarget(result.totalBudgetTarget);
      } else {
        setPlan(null);
        setGenError(result.error);
      }
    });
  }, [projectId]);

  useEffect(() => {
    if (!hasLoaded && !genLoading) {
      loadPlan();
    }
  }, [hasLoaded, genLoading, loadPlan]);

  function updateChecklistItem(
    index: number,
    field: "title" | "phase" | "dueDate",
    value: string,
  ) {
    setPlan((current) => {
      if (!current) return current;
      const checklist = [...current.checklist];
      checklist[index] = {
        ...checklist[index],
        [field]: field === "dueDate" ? value || null : value,
      };
      return { ...current, checklist };
    });
  }

  function removeChecklistItem(index: number) {
    setPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        checklist: current.checklist.filter((_, i) => i !== index),
      };
    });
  }

  function updateBudgetItem(
    index: number,
    field: "category" | "plannedAmount",
    value: string,
  ) {
    setPlan((current) => {
      if (!current) return current;
      const budget = [...current.budget];
      budget[index] = {
        ...budget[index],
        [field]:
          field === "plannedAmount"
            ? Math.max(0, Number(value.replace(/,/g, "")) || 0)
            : value,
      };
      return { ...current, budget };
    });
  }

  function removeBudgetItem(index: number) {
    setPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        budget: current.budget.filter((_, i) => i !== index),
      };
    });
  }

  function updateVendorCategory(
    index: number,
    field: "category" | "note",
    value: string,
  ) {
    setPlan((current) => {
      if (!current) return current;
      const vendorCategories = [...current.vendorCategories];
      vendorCategories[index] = {
        ...vendorCategories[index],
        [field]: value,
      };
      return { ...current, vendorCategories };
    });
  }

  function removeVendorCategory(index: number) {
    setPlan((current) => {
      if (!current) return current;
      return {
        ...current,
        vendorCategories: current.vendorCategories.filter((_, i) => i !== index),
      };
    });
  }

  function handleApprove() {
    if (!plan) return;

    startTransition(async () => {
      await commitPlan(projectId, plan);
    });
  }

  const budgetTotal = plan?.budget.reduce(
    (sum, item) => sum + item.plannedAmount,
    0,
  ) ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-[28px] leading-tight text-ink">
          Your plan
        </h2>
        <p className="mt-1.5 text-[15px] text-ink-muted">
          Review and tweak before we build your checklist, budget, and vendor
          list.
        </p>
      </div>

      {genLoading || (isPending && !plan) ? (
        <div className="rounded-lg border border-stone bg-surface px-6 py-12 text-center">
          <p className="font-display text-[22px] text-plum">
            Building your plan…
          </p>
          <p className="mt-2 text-[13px] text-ink-muted">
            This usually takes a few seconds.
          </p>
        </div>
      ) : null}

      {genError ? (
        <Card className="space-y-4 p-6 text-center">
          <p className="text-[15px] text-ink">{genError}</p>
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              onClick={() => loadPlan()}
              disabled={genLoading}
            >
              Try again
            </Button>
            <Button type="button" variant="default" onClick={onBack}>
              Back
            </Button>
          </div>
        </Card>
      ) : null}

      {plan && !genLoading ? (
        <>
          <section className="space-y-4">
            <Eyebrow>Checklist</Eyebrow>
            <div className="divide-y divide-stone rounded-lg border border-stone bg-surface">
              {plan.checklist.map((item, index) => (
                <div
                  key={`checklist-${index}`}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={item.title}
                      onChange={(event) =>
                        updateChecklistItem(index, "title", event.target.value)
                      }
                      aria-label="Task title"
                    />
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={item.phase}
                        onChange={(event) =>
                          updateChecklistItem(index, "phase", event.target.value)
                        }
                        className="rounded border border-stone bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-plum"
                        aria-label="Task phase"
                      >
                        {PHASE_OPTIONS.map((phase) => (
                          <option key={phase} value={phase}>
                            {phase}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="date"
                        value={item.dueDate ?? ""}
                        onChange={(event) =>
                          updateChecklistItem(
                            index,
                            "dueDate",
                            event.target.value,
                          )
                        }
                        className="w-auto"
                        aria-label="Due date"
                      />
                      <span className="self-center text-[13px] text-ink-muted">
                        {formatDueDate(item.dueDate)}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 self-start text-[13px]"
                    onClick={() => removeChecklistItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Eyebrow>Budget</Eyebrow>
              <p className="text-[13px] text-ink-muted tabular-nums">
                Total: {formatCurrency(budgetTotal)}
                {budgetTarget !== null ? (
                  <>
                    {" "}
                    / {formatCurrency(budgetTarget)} target
                  </>
                ) : null}
              </p>
            </div>
            <div className="divide-y divide-stone rounded-lg border border-stone bg-surface">
              {plan.budget.map((item, index) => (
                <div
                  key={`budget-${index}`}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <Input
                    value={item.category}
                    onChange={(event) =>
                      updateBudgetItem(index, "category", event.target.value)
                    }
                    className="min-w-0 flex-1"
                    aria-label="Budget category"
                  />
                  <div className="relative w-full sm:w-36">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[15px] text-ink-muted">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={String(item.plannedAmount)}
                      onChange={(event) =>
                        updateBudgetItem(
                          index,
                          "plannedAmount",
                          event.target.value,
                        )
                      }
                      className="pl-7 tabular-nums"
                      aria-label="Planned amount"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 self-start text-[13px] sm:self-center"
                    onClick={() => removeBudgetItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <Eyebrow>Vendor categories</Eyebrow>
            <div className="divide-y divide-stone rounded-lg border border-stone bg-surface">
              {plan.vendorCategories.map((item, index) => (
                <div
                  key={`vendor-${index}`}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      value={item.category}
                      onChange={(event) =>
                        updateVendorCategory(
                          index,
                          "category",
                          event.target.value,
                        )
                      }
                      aria-label="Vendor category"
                    />
                    <Textarea
                      rows={2}
                      value={item.note}
                      onChange={(event) =>
                        updateVendorCategory(index, "note", event.target.value)
                      }
                      placeholder="Why this matters for your wedding"
                      aria-label="Vendor note"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 self-start text-[13px]"
                    onClick={() => removeVendorCategory(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone pt-6">
            <Button
              type="button"
              variant="default"
              onClick={onBack}
              disabled={isPending}
            >
              Back
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                onClick={() => loadPlan({ replace: true })}
                disabled={genLoading || isPending}
              >
                Regenerate
              </Button>
              <Button
                type="button"
                onClick={handleApprove}
                disabled={isPending || plan.checklist.length === 0}
              >
                {isPending ? "Saving…" : "Approve & start planning"}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function StepProgress({ currentStep }: { currentStep: number }) {
  const STEPS = [
    { id: 1, label: "The basics" },
    { id: 2, label: "Your budget" },
    { id: 3, label: "Your style" },
    { id: 4, label: "Your plan" },
  ] as const;

  return (
    <div className="mb-10 flex items-center overflow-x-auto">
      {STEPS.map((step, index) => {
        const isLit = step.id <= currentStep;
        const isLast = index === STEPS.length - 1;

        return (
          <div
            key={step.id}
            className={cn("flex items-center gap-2.5", !isLast && "flex-1")}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "size-[9px] shrink-0 rounded-full",
                  isLit ? "bg-plum" : "bg-stone",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  isLit ? "font-medium text-plum-deep" : "text-ink-muted",
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast ? (
              <span className="mx-2 h-px min-w-4 flex-1 bg-stone" aria-hidden />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
