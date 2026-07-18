"use client";

import { useEffect, useState, useTransition } from "react";
import { updateWeddingDate } from "@/app/(app)/projects/[projectId]/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type WeddingDateEditorProps = {
  projectId: string;
  weddingDate: string | null;
  /** Align editor cluster for centered heroes (couple Overview). */
  align?: "start" | "center";
  className?: string;
};

export function WeddingDateEditor({
  projectId,
  weddingDate,
  align = "start",
  className,
}: WeddingDateEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(weddingDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(weddingDate ?? "");
    setError(null);
  }, [weddingDate]);

  function openEditor() {
    setValue(weddingDate ?? "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setValue(weddingDate ?? "");
    setError(null);
    setEditing(false);
  }

  function save(next: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await updateWeddingDate(projectId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={openEditor}
        className={cn(
          "shrink-0 text-[14px] font-semibold text-accent hover:opacity-80",
          className,
        )}
      >
        {weddingDate ? "Edit date" : "Set date"}
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2",
        align === "center" && "items-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          align === "center" && "justify-center",
        )}
      >
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isPending}
          aria-label="Wedding date"
          className="rounded-[var(--radius-inner)] border border-ring bg-surface px-3 py-2 text-[14px] font-medium text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        />
        <Button
          type="button"
          variant="primary"
          disabled={isPending}
          onClick={() => {
            if (!value.trim()) {
              setError("Enter a valid date.");
              return;
            }
            save(value);
          }}
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
        {weddingDate ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => save(null)}
            className="text-[13px] font-medium text-muted hover:text-rosewood disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
