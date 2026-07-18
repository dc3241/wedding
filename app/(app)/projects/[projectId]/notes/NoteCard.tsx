"use client";

import { useEffect, useState, useTransition } from "react";
import { removeNote, updateNote } from "./actions";
import { formatNoteUpdatedAt, type Note } from "./types";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

export function NoteCard({ note }: { note: Note }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTitle(note.title);
  }, [note.title]);

  useEffect(() => {
    setBody(note.body ?? "");
  }, [note.body]);

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

  function handleDelete() {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    startTransition(async () => {
      await removeNote(note.id);
    });
  }

  return (
    <Card className={cn("px-6 py-5", isPending && "opacity-60")}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Note title"
          className="min-w-0 flex-1 bg-transparent font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="shrink-0 text-[13px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <div className="rounded-[var(--radius-inner)] bg-well p-4 shadow-recessed">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={saveBody}
          aria-label="Note body"
          rows={5}
          placeholder="Meeting notes, ideas, reminders…"
          className="mb-0 resize-y border-0 bg-transparent px-0 py-0 shadow-none focus:border-transparent focus:outline-none"
        />
      </div>

      <p className="mt-3 text-[13px] text-muted">
        Updated {formatNoteUpdatedAt(note.updated_at)}
      </p>
    </Card>
  );
}
