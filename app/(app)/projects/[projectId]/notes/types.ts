export type Note = {
  id: string;
  title: string;
  body: string | null;
  updated_at: string;
};

export function formatNoteUpdatedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
