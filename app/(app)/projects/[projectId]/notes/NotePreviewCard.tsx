"use client";

import {
  formatNoteUpdatedAt,
  previewNoteBody,
  type Note,
} from "./types";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";

export function NotePreviewCard({
  note,
  onOpen,
}: {
  note: Note;
  onOpen: () => void;
}) {
  const preview = previewNoteBody(note.body);
  const needsAction = note.action_status === "needs_action";
  const isDone = note.action_status === "done";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "flex h-full cursor-pointer flex-col px-5 py-4 transition-transform duration-150",
        "hover:-translate-y-px",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "motion-reduce:hover:translate-y-0",
      )}
      aria-label={`Open note: ${note.title}`}
    >
      <div className="mb-2 flex items-start gap-2">
        <h3 className="min-w-0 flex-1 truncate font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          {note.title}
        </h3>
        {needsAction ? (
          <span
            className="mt-1.5 size-2 shrink-0 rounded-full bg-rosewood"
            title="Action needed"
            aria-label="Action needed"
          />
        ) : null}
        {isDone ? (
          <Pill variant="sage" className="shrink-0">
            Done
          </Pill>
        ) : null}
      </div>

      <p
        className={cn(
          "min-h-[3.75rem] flex-1 text-[14px] font-medium leading-relaxed",
          preview ? "text-ink" : "text-muted",
        )}
      >
        {preview || "No details yet"}
      </p>

      <div className="mt-3 border-t border-hairline pt-3">
        <p className="truncate text-[13px] text-muted">{note.author_email}</p>
        <p className="mt-0.5 text-[13px] text-muted">
          Updated {formatNoteUpdatedAt(note.updated_at)}
        </p>
      </div>
    </Card>
  );
}
