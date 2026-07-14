"use client";

import { useEffect, useState, useTransition } from "react";
import {
  toggleTask,
  updateTaskTitle,
} from "@/app/(app)/projects/[projectId]/checklist/actions";
import { useAccountKind } from "@/components/account-density-provider";
import { dataRowClass } from "@/lib/density";
import { cn } from "@/lib/cn";

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

function formatDueDate(date: string | null) {
  if (!date) return null;
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(dueDate: string | null, status: ChecklistTask["status"]) {
  if (!dueDate || status === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return due < today;
}

function dueDateClass(task: ChecklistTask) {
  if (task.status === "done") return "border-sage/40 text-sage";
  if (isOverdue(task.due_date, task.status))
    return "border-rosewood/40 text-rosewood";
  return "border-stone text-ink-muted";
}

export function TaskRow({ task }: { task: ChecklistTask }) {
  const accountKind = useAccountKind();
  const [title, setTitle] = useState(task.title);
  const [isPending, startTransition] = useTransition();
  const dueDate = formatDueDate(task.due_date);
  const done = task.status === "done";
  const inProgress = task.status === "in_progress";

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
      className={cn(
        "flex items-center gap-3",
        dataRowClass(accountKind),
        accountKind === "personal" && "py-2",
        isPending && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={handleStatusClick}
        aria-label={`Status: ${STATUS_LABEL[task.status]}. Click to change.`}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
          done
            ? "border-sage bg-sage text-surface"
            : inProgress
              ? "border-clay bg-surface"
              : "border-stone bg-surface hover:border-ink-muted",
        )}
      >
        {done ? (
          <svg
            viewBox="0 0 12 12"
            className="size-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M2 6l3 3 5-5" />
          </svg>
        ) : inProgress ? (
          <span className="size-2 rounded-full bg-clay" aria-hidden />
        ) : null}
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
        className={cn(
          "min-w-0 flex-1 bg-transparent outline-none",
          accountKind === "business" ? "text-[13px]" : "text-sm",
          done ? "text-ink-muted line-through" : "text-ink",
        )}
      />

      {dueDate ? (
        <span
          className={cn(
            "shrink-0 rounded-full border border-stone px-2 py-0.5 text-[11px] tabular-nums",
            dueDateClass(task),
          )}
        >
          {dueDate}
        </span>
      ) : null}
    </li>
  );
}
