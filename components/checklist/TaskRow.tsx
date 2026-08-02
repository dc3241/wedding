"use client";

import { useEffect, useState, useTransition } from "react";
import {
  deleteTask,
  toggleTask,
  updateTaskTitle,
} from "@/app/(app)/projects/[projectId]/checklist/actions";
import { Pill } from "@/components/ui/pill";
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
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TaskRow({ task }: { task: ChecklistTask }) {
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

  function handleDelete() {
    startTransition(async () => {
      await deleteTask(task.id);
    });
  }

  return (
    <li
      className={cn(
        "group mb-2 flex items-start gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed last:mb-0",
        isPending && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={handleStatusClick}
        aria-label={`Status: ${STATUS_LABEL[task.status]}. Click to change.`}
        className={cn(
          "mt-0.5 flex size-[19px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          done
            ? "border-sage bg-sage text-surface"
            : inProgress
              ? "border-clay bg-clay-wash"
              : "border-ring bg-transparent hover:border-muted",
        )}
      >
        {done ? (
          <svg
            viewBox="0 0 12 12"
            className="size-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden
          >
            <path d="M2.5 6l2.5 2.5 4.5-5" />
          </svg>
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
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
            "w-full bg-transparent text-[15px] font-medium leading-snug outline-none",
            done ? "text-muted" : "text-ink",
          )}
        />
        {dueDate ? (
          <p className="mt-1 text-[13px] font-normal text-muted">
            Due {dueDate}
          </p>
        ) : null}
      </div>

      {inProgress ? <Pill variant="clay">In progress</Pill> : null}

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        aria-label={`Delete ${task.title}`}
        className={cn(
          "mt-0.5 ml-1 shrink-0 rounded-[var(--radius-inner)] p-1.5 text-muted opacity-0 transition-all",
          "hover:bg-rosewood-wash hover:text-rosewood",
          "focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          "disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <svg
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M3.5 4.5h9M6.5 4.5V3.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75V4.5m1.5 0V12.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4.5" />
          <path d="M7 7v4.5M9 7v4.5" />
        </svg>
      </button>
    </li>
  );
}
