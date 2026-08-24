"use client";

import { useRef, useTransition } from "react";
import { addTask } from "@/app/(app)/projects/[projectId]/checklist/actions";
import { cn } from "@/lib/cn";

export function AddTask({
  projectId,
  phase,
}: {
  projectId: string;
  phase: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = inputRef.current?.value ?? "";
    if (!title.trim()) return;

    startTransition(async () => {
      await addTask(projectId, phase, title);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <label
        className={cn(
          "flex cursor-text items-center gap-3 rounded-[var(--radius-inner)] border border-ring bg-well px-4 py-3 shadow-recessed transition-colors",
          "focus-within:outline focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-accent",
          isPending && "opacity-50",
        )}
      >
        <span
          aria-hidden
          className="flex size-[19px] shrink-0 items-center justify-center rounded-full border-2 border-accent/35 bg-accent-wash text-[14px] font-bold leading-none text-accent"
        >
          +
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Add a task…"
          disabled={isPending}
          aria-label="Add a task"
          className={cn(
            "min-w-0 flex-1 border-none bg-transparent p-0 text-[15px] font-medium text-ink outline-none",
            "placeholder:text-ink/50 disabled:cursor-not-allowed",
          )}
        />
      </label>
    </form>
  );
}
