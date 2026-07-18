"use client";

import { AddTask } from "./AddTask";
import { TaskRow, type ChecklistTask } from "./TaskRow";
import { useAccountKind } from "@/components/account-density-provider";
import { phaseSectionClass } from "@/lib/density";
import { cn } from "@/lib/cn";

export function PhaseGroup({
  label,
  phase,
  tasks,
  projectId,
  isLast = false,
}: {
  label: string;
  phase: string | null;
  tasks: ChecklistTask[];
  projectId: string;
  isLast?: boolean;
}) {
  const accountKind = useAccountKind();
  const isPlanner = accountKind === "business";

  return (
    <li className={phaseSectionClass(accountKind, isLast)}>
      <span
        className="absolute top-1.5 -left-px size-2.5 -translate-x-1/2 rounded-full border border-ring bg-canvas"
        aria-hidden
      />

      <h2
        className={cn(
          "font-medium text-ink",
          isPlanner ? "text-sm" : "text-base",
        )}
      >
        {label}
      </h2>

      {tasks.length > 0 ? (
        <ul className={cn("divide-y divide-hairline", isPlanner ? "mt-2" : "mt-3")}>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      ) : null}

      <AddTask projectId={projectId} phase={phase} />
    </li>
  );
}
