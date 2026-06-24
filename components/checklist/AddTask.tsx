"use client";

import { useRef, useState, useTransition } from "react";
import { addTask } from "@/app/(app)/projects/[projectId]/checklist/actions";

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
    <form onSubmit={handleSubmit} className="mt-1">
      <input
        ref={inputRef}
        type="text"
        placeholder="Add a task…"
        disabled={isPending}
        className="w-full rounded-md border border-dashed border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 disabled:opacity-50"
      />
    </form>
  );
}
