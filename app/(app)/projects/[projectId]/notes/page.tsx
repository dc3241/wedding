import { AddNoteButton } from "./AddNoteButton";
import { NoteCard } from "./NoteCard";
import type { Note } from "./types";
import { FileManager } from "@/components/files/FileManager";
import type { ProjectFile } from "@/components/files/types";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

export default async function NotesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");

  const [{ data: notes }, { data: fileRows }] = await Promise.all([
    supabase
      .from("notes")
      .select("id, title, body, updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("files")
      .select("id, name, mime_type, size_bytes, created_at")
      .eq("project_id", projectId)
      .eq("kind", "file")
      .order("created_at", { ascending: false }),
  ]);

  const noteList = (notes ?? []) as Note[];
  const fileList: ProjectFile[] = (fileRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    mime_type: row.mime_type,
    size_bytes:
      row.size_bytes === null || row.size_bytes === undefined
        ? null
        : Number(row.size_bytes),
    created_at: row.created_at,
  }));

  return (
    <div className={stackClass}>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Notes & files</Eyebrow>
          <h1 className="mt-1 text-[20px] font-medium text-ink">Project notes</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Meeting notes and freeform thoughts for this wedding.
          </p>
        </div>
        <AddNoteButton projectId={projectId} />
      </header>

      {noteList.length === 0 ? (
        <p className="px-1 text-[13px] text-ink-muted">
          No notes yet. Add one to capture meeting notes or ideas.
        </p>
      ) : (
        <ul className="space-y-4">
          {noteList.map((note) => (
            <li key={note.id}>
              <NoteCard note={note} />
            </li>
          ))}
        </ul>
      )}

      <FileManager projectId={projectId} kind="file" files={fileList} />
    </div>
  );
}
