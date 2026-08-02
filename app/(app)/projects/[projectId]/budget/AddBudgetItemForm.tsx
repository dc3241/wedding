"use client";

import { useTransition } from "react";
import { addBudgetItem } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddBudgetItemForm({
  projectId,
  onAdded,
}: {
  projectId: string;
  onAdded?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const category = (form.get("category") as string) ?? "";
    const label = (form.get("label") as string) ?? "";
    const plannedRaw = (form.get("planned_amount") as string) ?? "0";
    const actualRaw = (form.get("actual_amount") as string) ?? "";
    const dueRaw = (form.get("due_date") as string) ?? "";
    const plannedAmount = Number(plannedRaw);
    const actualAmount = actualRaw.trim() ? Number(actualRaw) : null;
    const dueDate = dueRaw.trim() || null;

    // Capture before the await — React nulls the synthetic event's currentTarget.
    const formEl = e.currentTarget;

    startTransition(async () => {
      await addBudgetItem(
        projectId,
        category,
        label,
        Number.isNaN(plannedAmount) ? 0 : plannedAmount,
        actualAmount !== null && !Number.isNaN(actualAmount)
          ? actualAmount
          : null,
        dueDate,
      );
      formEl.reset();
      onAdded?.();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="min-w-0 space-y-1.5">
          <label
            htmlFor="budget-category"
            className="text-sm font-medium text-ink"
          >
            Category
          </label>
          <Input
            id="budget-category"
            name="category"
            type="text"
            placeholder="e.g. attire"
            disabled={isPending}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="budget-label" className="text-sm font-medium text-ink">
            Vendor Name{" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <Input
            id="budget-label"
            name="label"
            type="text"
            placeholder="e.g. Bloom & Co"
            disabled={isPending}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label
            htmlFor="budget-planned"
            className="text-sm font-medium text-ink"
          >
            Estimate
          </label>
          <Input
            id="budget-planned"
            name="planned_amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={0}
            disabled={isPending}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label
            htmlFor="budget-actual"
            className="text-sm font-medium text-ink"
          >
            Actual{" "}
            <span className="font-normal text-muted">(optional)</span>
          </label>
          <Input
            id="budget-actual"
            name="actual_amount"
            type="number"
            min={0}
            step="0.01"
            disabled={isPending}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label
            htmlFor="budget-due-date"
            className="text-sm font-medium text-ink"
          >
            Due date{" "}
            <span className="font-normal text-muted">
              (optional first installment)
            </span>
          </label>
          <Input
            id="budget-due-date"
            name="due_date"
            type="date"
            disabled={isPending}
          />
        </div>
      </div>
      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? "Adding…" : "Add item"}
      </Button>
    </form>
  );
}
