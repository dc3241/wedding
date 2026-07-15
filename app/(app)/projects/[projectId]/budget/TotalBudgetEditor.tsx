"use client";

import { useEffect, useState, useTransition } from "react";
import { setBudgetTarget } from "./actions";
import { formatCurrency } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Inline total-budget control — same setBudgetTarget action + validation as the
 * previous BudgetSummary target editor; display → Edit → save / clear (SET-01 idiom).
 */
export function TotalBudgetEditor({
  projectId,
  totalBudget,
}: {
  projectId: string;
  totalBudget: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    totalBudget !== null ? String(totalBudget) : "",
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(totalBudget !== null ? String(totalBudget) : "");
  }, [totalBudget]);

  function openEditor() {
    setValue(totalBudget !== null ? String(totalBudget) : "");
    setEditing(true);
  }

  function cancel() {
    setValue(totalBudget !== null ? String(totalBudget) : "");
    setEditing(false);
  }

  function persist(next: number | null) {
    startTransition(async () => {
      await setBudgetTarget(projectId, next);
      setEditing(false);
    });
  }

  function save() {
    const trimmed = value.trim();

    if (!trimmed) {
      if (totalBudget === null) {
        setEditing(false);
        return;
      }
      persist(null);
      return;
    }

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed) || parsed < 0) {
      setValue(totalBudget !== null ? String(totalBudget) : "");
      return;
    }

    if (totalBudget !== null && parsed === totalBudget) {
      setEditing(false);
      return;
    }

    persist(parsed);
  }

  if (!editing) {
    if (totalBudget === null) {
      return (
        <button
          type="button"
          onClick={openEditor}
          className="shrink-0 text-[13px] font-medium text-plum hover:text-plum-deep"
        >
          Set total budget
        </button>
      );
    }

    return (
      <div className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-1">
        <span className="text-[15px] tabular-nums text-ink">
          Total budget {formatCurrency(totalBudget)}
        </span>
        <button
          type="button"
          onClick={openEditor}
          className="shrink-0 text-[13px] font-medium text-plum hover:text-plum-deep"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-end gap-2",
        isPending && "opacity-60",
      )}
    >
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        disabled={isPending}
        aria-label="Budget target"
        placeholder="0"
        className="w-[7.5rem] rounded border border-stone bg-surface px-2.5 py-1.5 text-right text-sm tabular-nums text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plum disabled:opacity-50"
      />
      <Button
        type="button"
        variant="primary"
        disabled={isPending}
        onClick={save}
        className="px-3 py-1.5 text-[13px]"
      >
        {isPending ? "Saving…" : "Save"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={isPending}
        onClick={cancel}
        className="px-3 py-1.5 text-[13px]"
      >
        Cancel
      </Button>
      {totalBudget !== null ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => persist(null)}
          className="text-[13px] font-medium text-ink-muted hover:text-rosewood disabled:opacity-50"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
