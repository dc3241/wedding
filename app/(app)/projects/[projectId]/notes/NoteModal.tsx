"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { removeNote, updateNote } from "./actions";
import { formatNoteUpdatedAt, type Note, type NoteActionStatus } from "./types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

export function NoteModal({
  note,
  onClose,
}: {
  note: Note;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body ?? "");
  const [actionStatus, setActionStatus] = useState<NoteActionStatus>(
    note.action_status,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body ?? "");
    setActionStatus(note.action_status);
  }, [note]);

  useEffect(() => {
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === note.title) {
      setTitle(note.title);
      return;
    }
    startTransition(async () => {
      await updateNote(note.id, { title: trimmed });
    });
  }

  function saveBody() {
    const nextBody = body.trim() || "";
    const currentBody = note.body ?? "";
    if (nextBody === currentBody) return;
    startTransition(async () => {
      await updateNote(note.id, { body: nextBody });
    });
  }

  function setStatus(next: NoteActionStatus) {
    if (next === actionStatus) return;
    setActionStatus(next);
    startTransition(async () => {
      await updateNote(note.id, { action_status: next });
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    startTransition(async () => {
      await removeNote(note.id);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-ink/25"
        onClick={onClose}
        aria-hidden
      />
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden px-6 py-5",
          isPending && "opacity-60",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <input
              id={titleId}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              aria-label="Note title"
              className="w-full bg-transparent font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <p className="mt-1 truncate text-[13px] text-muted">
              {note.author_email}
              <span className="mx-1.5">·</span>
              Updated {formatNoteUpdatedAt(note.updated_at)}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="shrink-0 text-[14px] font-semibold text-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="rounded-[var(--radius-inner)] bg-well p-4 shadow-recessed">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={saveBody}
              aria-label="Note body"
              rows={10}
              placeholder="Meeting notes, ideas, reminders…"
              className="mb-0 min-h-[12rem] resize-y border-0 bg-transparent px-0 py-0 shadow-none focus:border-transparent focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
          {actionStatus === "needs_action" ? (
            <span
              className="mr-1 size-2 rounded-full bg-rosewood"
              aria-hidden
            />
          ) : null}
          {actionStatus === "done" ? <Pill variant="sage">Done</Pill> : null}

          {actionStatus === null ? (
            <Button
              type="button"
              variant="default"
              onClick={() => setStatus("needs_action")}
              disabled={isPending}
            >
              Action needed
            </Button>
          ) : null}

          {actionStatus === "needs_action" ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => setStatus("done")}
              disabled={isPending}
            >
              Mark done
            </Button>
          ) : null}

          {actionStatus !== null ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStatus(null)}
              disabled={isPending}
            >
              Clear
            </Button>
          ) : null}

          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="ml-auto shrink-0 text-[13px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </Card>
    </div>
  );
}
