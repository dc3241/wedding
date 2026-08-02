"use client";

import { useState, useTransition } from "react";
import { setFileCategory } from "@/app/(app)/projects/[projectId]/contracts/actions";
import { Select } from "@/components/ui/select";
import {
  VENDOR_CATEGORIES,
  vendorCategoryLabel,
} from "@/lib/vendor-categories";
import { cn } from "@/lib/cn";

export function ContractCategoryControl({
  fileId,
  initialCategory,
}: {
  fileId: string;
  initialCategory: string | null;
}) {
  const [category, setCategory] = useState<string>(initialCategory ?? "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const label = category
    ? vendorCategoryLabel(category)
    : "Uncategorized";

  function commit(next: string) {
    const previous = category;
    setError(null);
    setCategory(next);
    setEditing(false);

    startTransition(async () => {
      const result = await setFileCategory(fileId, next === "" ? null : next);
      if (!result.ok) {
        setCategory(previous);
        setError(result.error);
      }
    });
  }

  if (editing) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Select
          value={category}
          disabled={isPending}
          aria-label="Contract category"
          className="min-w-[140px] py-1.5 text-[13px]"
          autoFocus
          onChange={(e) => commit(e.target.value)}
          onBlur={() => {
            if (!isPending) setEditing(false);
          }}
        >
          <option value="">Uncategorized</option>
          {VENDOR_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </Select>
        {error ? (
          <p className="max-w-[160px] text-right text-[11px] text-rosewood">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={isPending}
        onClick={() => setEditing(true)}
        className={cn(
          "rounded-[var(--radius-pill)] bg-well px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.03em] text-muted shadow-recessed transition-colors",
          "hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          isPending && "opacity-60",
        )}
        aria-label={
          category
            ? `Category: ${label}. Change category`
            : "Uncategorized. Set category"
        }
      >
        {label}
      </button>
      {error ? (
        <p className="max-w-[160px] text-right text-[11px] text-rosewood">
          {error}
        </p>
      ) : null}
    </div>
  );
}
