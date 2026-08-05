export type NoteActionStatus = "needs_action" | "done" | null;

export type Note = {
  id: string;
  title: string;
  body: string | null;
  updated_at: string;
  created_by: string | null;
  author_email: string;
  action_status: NoteActionStatus;
};

export const NOTE_PREVIEW_LENGTH = 120;

export function formatNoteUpdatedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function previewNoteBody(body: string | null): string {
  const text = (body ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= NOTE_PREVIEW_LENGTH) return text;
  return `${text.slice(0, NOTE_PREVIEW_LENGTH).trimEnd()}…`;
}

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    const aPin = a.action_status === "needs_action" ? 0 : 1;
    const bPin = b.action_status === "needs_action" ? 0 : 1;
    if (aPin !== bPin) return aPin - bPin;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

export function parseActionStatus(value: unknown): NoteActionStatus {
  if (value === "needs_action" || value === "done") return value;
  return null;
}
