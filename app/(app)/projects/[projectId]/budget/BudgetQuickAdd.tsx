"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addBudgetItemsBulk } from "./actions";
import { BUDGET_QUICK_CATEGORIES } from "@/lib/budget-quick-categories";
import { cn } from "@/lib/cn";

export function BudgetQuickAdd({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  function closeMenu() {
    setOpen(false);
    setSelected([]);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSelected([]);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setSelected([]);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function toggleCategory(category: string) {
    setSelected((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  }

  function commit() {
    if (selected.length === 0) return;
    const categories = [...selected];
    startTransition(async () => {
      await addBudgetItemsBulk(projectId, categories);
      closeMenu();
    });
  }

  const count = selected.length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (open) closeMenu();
          else setOpen(true);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={isPending}
        className={cn(
          "rounded-[var(--radius-pill)] bg-well px-4 py-2.5 text-[14px] font-semibold text-muted shadow-recessed transition-colors hover:text-ink disabled:opacity-50",
          open && "text-ink",
        )}
      >
        {isPending ? "Adding…" : "Quick add"}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Quick add budget categories"
          className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised"
        >
          <ul className="max-h-72 overflow-y-auto py-1.5">
            {BUDGET_QUICK_CATEGORIES.map((category) => {
              const checked = selected.includes(category);
              const id = `quick-add-${category.replace(/\s+/g, "-").toLowerCase()}`;
              return (
                <li key={category} role="none">
                  <label
                    htmlFor={id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2 text-[14px] font-medium text-ink transition-colors hover:bg-well"
                  >
                    <input
                      id={id}
                      type="checkbox"
                      role="menuitemcheckbox"
                      checked={checked}
                      disabled={isPending}
                      onChange={() => toggleCategory(category)}
                      className="size-4 shrink-0 rounded border border-ring text-ink disabled:opacity-50"
                    />
                    <span className="min-w-0">{category}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-hairline p-2">
            <button
              type="button"
              onClick={commit}
              disabled={count === 0 || isPending}
              className="w-full rounded-[var(--radius-pill)] bg-accent-wash px-3 py-2 text-[13px] font-semibold text-accent transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              {count === 0 ? "Add" : `Add ${count}`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
