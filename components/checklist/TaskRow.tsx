"use client";

import { useEffect, useState, useTransition } from "react";
import {
  toggleTask,
  updateTaskTitle,
} from "@/app/(app)/projects/[projectId]/checklist/actions";

export type ChecklistTask = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
};

const STATUS_CYCLE: Record<
  ChecklistTask["status"],
  ChecklistTask["status"]
> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

const STATUS_LABEL: Record<ChecklistTask["status"], string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const STATUS_PILL: Record<ChecklistTask["status"], string> = {
  todo: "bg-zinc-100 text-zinc-600",
  in_progress: "bg-amber-50 text-amber-700",
  done: "bg-green-50 text-green-700",
};

function formatDueDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function TaskRow({ task }: { task: ChecklistTask }) {
  const [title, setTitle] = useState(task.title);
  const [isPending, startTransition] = useTransition();
  const dueDate = formatDueDate(task.due_date);

  useEffect(() => {
    setTitle(task.title);
  }, [task.title]);

  function handleStatusClick() {
    const nextStatus = STATUS_CYCLE[task.status];
    startTransition(async () => {
      await toggleTask(task.id, nextStatus);
    });
  }

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === task.title) {
      setTitle(task.title);
      return;
    }
    startTransition(async () => {
      await updateTaskTitle(task.id, trimmed);
    });
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-md px-2 py-2 hover:bg-zinc-50 ${isPending ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        onClick={handleStatusClick}
        aria-label={`Status: ${STATUS_LABEL[task.status]}. Click to change.`}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          task.status === "done"
            ? "border-green-600 bg-green-600 text-white"
            : "border-zinc-300 bg-white"
        }`}
      >
        {task.status === "done" && (
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        )}
      </button>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveTitle}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
          task.status === "done" ? "text-zinc-400 line-through" : ""
        }`}
      />

      {dueDate && (
        <span className="shrink-0 text-xs text-zinc-400">{dueDate}</span>
      )}

      <button
        type="button"
        onClick={handleStatusClick}
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL[task.status]}`}
      >
        {STATUS_LABEL[task.status]}
      </button>
    </li>
  );
}
