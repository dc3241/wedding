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
    <Card className={cn("p-5", isPending && "opacity-60")}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Note title"
          className="min-w-0 flex-1 bg-transparent text-[20px] font-medium text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="shrink-0 text-[13px] text-ink-muted transition-colors hover:text-rosewood disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={saveBody}
        aria-label="Note body"
        rows={5}
        placeholder="Meeting notes, ideas, reminders…"
        className="mb-3 resize-y text-[15px]"
      />

      <p className="text-[13px] text-ink-muted">
        Updated {formatNoteUpdatedAt(note.updated_at)}
      </p>
    </Card>
  );
}
