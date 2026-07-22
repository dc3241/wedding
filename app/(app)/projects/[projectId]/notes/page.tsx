import { AddNoteButton } from "./AddNoteButton";
import { NoteCard } from "./NoteCard";
import type { Note } from "./types";
import { FileManager } from "@/components/files/FileManager";
import type { ProjectFile } from "@/components/files/types";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { createClient } from "@/utils/supabase/server";

function formatEyebrowDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function NotesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const stackClass = sectionStackClass(account?.kind ?? "personal");

  const [{ data: notes }, { data: fileRows }, { data: project }] =
    await Promise.all([
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
      supabase
        .from("projects")
        .select("name, wedding_date")
        .eq("id", projectId)
        .maybeSingle(),
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

  const projectName = project?.name ?? "Your wedding";
  const weddingDate = project?.wedding_date ?? null;
  const eyebrow =
    weddingDate != null
      ? `${projectName} · ${formatEyebrowDate(weddingDate)}`
      : projectName;

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow={eyebrow}
        title="Notes & files"
        description="Meeting notes, ideas, and documents for this wedding."
        actions={<AddNoteButton projectId={projectId} />}
      />

      <section className="space-y-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Notes
        </p>
        {noteList.length === 0 ? (
          <EmptyState>No notes yet. Add one to capture ideas.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {noteList.map((note) => (
              <li key={note.id}>
                <NoteCard note={note} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <FileManager projectId={projectId} kind="file" files={fileList} />
    </div>
  );
}
