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
      <input
        ref={inputRef}
        type="text"
        placeholder="Add a task…"
        disabled={isPending}
        className={cn(
          "w-full rounded-[var(--radius-inner)] border border-dashed border-ring bg-transparent px-4 py-3 text-[15px] font-medium text-ink outline-none transition-colors",
          "placeholder:text-muted focus:border-accent disabled:opacity-50",
        )}
      />
    </form>
  );
}
