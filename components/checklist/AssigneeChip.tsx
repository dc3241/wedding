"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { assignTask } from "@/app/(app)/projects/[projectId]/checklist/actions";
import {
  emailInitials,
  formatRoleLabel,
  groupAssignees,
  type ProjectAssignee,
} from "@/components/checklist/assignee-utils";
import { cn } from "@/lib/cn";

function AssigneeAvatar({
  initials,
  filled,
}: {
  initials: string;
  filled?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-[var(--radius-pill)] text-[10px] font-extrabold tracking-[0.02em]",
        filled
          ? "bg-accent text-surface"
          : "border border-ring bg-transparent text-muted",
      )}
    >
      {initials}
    </span>
  );
}

export function AssigneeChip({
  taskId,
  projectId,
  assignedTo,
  assignees,
}: {
  taskId: string;
  projectId: string;
  assignedTo: string | null;
  assignees: ProjectAssignee[];
}) {
  const pickerId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(
    null,
  );
  const [assigned, setAssigned] = useState(assignedTo);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setAssigned(assignedTo);
  }, [assignedTo]);

  useEffect(() => {
    if (!open) return;

    function place() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const person = assigned
    ? assignees.find((a) => a.userId === assigned)
    : null;
  const unassigned = assigned == null;
  const initials = unassigned
    ? "—"
    : person
      ? emailInitials(person.email)
      : "?";

  function pick(userId: string | null) {
    if (userId === assigned) {
      setOpen(false);
      return;
    }
    const previous = assigned;
    setAssigned(userId);
    setError(null);
    startTransition(async () => {
      const result = await assignTask(taskId, projectId, userId);
      if (!result.ok) {
        setAssigned(previous);
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  const groups = groupAssignees(assignees);

  const menu =
    mounted && open && coords
      ? createPortal(
          <div
            ref={menuRef}
            id={pickerId}
            role="listbox"
            aria-label="Assign task"
            style={{ top: coords.top, right: coords.right }}
            className="fixed z-50 max-h-[min(20rem,70vh)] w-[min(16.5rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--radius-inner)] bg-surface p-1.5 shadow-raised"
          >
            <button
              type="button"
              role="option"
              aria-selected={unassigned}
              disabled={isPending}
              onClick={() => pick(null)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-inner)] px-2 py-1.5 text-left text-[13px] font-medium",
                unassigned
                  ? "bg-accent-wash text-accent"
                  : "text-ink hover:bg-well",
              )}
            >
              <AssigneeAvatar initials="—" />
              Unassigned
            </button>

            {groups.map((group) => (
              <div key={group.roleLabel} className="mt-1.5">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-muted">
                  {formatRoleLabel(group.roleLabel)}
                </p>
                {group.people.map((item) => {
                  const selected = assigned === item.userId;
                  return (
                    <button
                      key={item.userId}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={isPending}
                      onClick={() => pick(item.userId)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-inner)] px-2 py-1.5 text-left text-[13px] font-medium",
                        selected
                          ? "bg-accent-wash text-accent"
                          : "text-ink hover:bg-well",
                      )}
                    >
                    <AssigneeAvatar
                      initials={emailInitials(item.email)}
                      filled={selected}
                    />
                      <span className="min-w-0 truncate">{item.email}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={pickerId}
        aria-label={
          unassigned
            ? "Assignee: Unassigned"
            : `Assignee: ${person?.email ?? "Unknown"}`
        }
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "mt-0.5 inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-1 text-[12px] font-semibold transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:pointer-events-none disabled:opacity-60",
          unassigned
            ? "text-muted hover:bg-surface hover:text-ink"
            : "hover:bg-accent-wash",
          isPending && "opacity-60",
        )}
      >
        <AssigneeAvatar initials={initials} filled={!unassigned} />
        {unassigned ? <span>Unassigned</span> : null}
      </button>
      {menu}
      {error ? (
        <p className="mt-1 max-w-[10rem] text-[12px] font-medium text-rosewood">
          {error}
        </p>
      ) : null}
    </div>
  );
}
