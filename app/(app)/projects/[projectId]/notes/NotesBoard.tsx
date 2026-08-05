"use client";

import { useEffect, useState } from "react";
import { NoteModal } from "./NoteModal";
import { NotePreviewCard } from "./NotePreviewCard";
import { sortNotes, type Note } from "./types";

export function NotesBoard({ notes }: { notes: Note[] }) {
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const sorted = sortNotes(notes);
  const openNote = openNoteId
    ? (sorted.find((note) => note.id === openNoteId) ?? null)
    : null;

  useEffect(() => {
    if (openNoteId && !notes.some((note) => note.id === openNoteId)) {
      setOpenNoteId(null);
    }
  }, [openNoteId, notes]);

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sorted.map((note) => (
          <li key={note.id} className="min-w-0">
            <NotePreviewCard
              note={note}
              onOpen={() => setOpenNoteId(note.id)}
            />
          </li>
        ))}
      </ul>

      {openNote ? (
        <NoteModal note={openNote} onClose={() => setOpenNoteId(null)} />
      ) : null}
    </>
  );
}
