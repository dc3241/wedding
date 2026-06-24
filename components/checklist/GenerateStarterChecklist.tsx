"use client";

import { useTransition } from "react";
import { generateStarterChecklist } from "@/app/(app)/projects/[projectId]/checklist/actions";

export function GenerateStarterChecklist({
  projectId,
}: {
  projectId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center">
      <p className="text-sm text-zinc-500">
        No tasks yet. Generate a starter timeline or add tasks below.
      </p>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(() => generateStarterChecklist(projectId))
        }
        className="mt-3 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {isPending ? "Generating…" : "Generate starter checklist"}
      </button>
    </div>
  );
}
