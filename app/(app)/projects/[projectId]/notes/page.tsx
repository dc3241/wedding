import { AddNoteButton } from "./AddNoteButton";
import { NotesBoard } from "./NotesBoard";
import {
  parseActionStatus,
  sortNotes,
  type Note,
} from "./types";
import { AskAssistantPrompt } from "@/components/assistant/AskAssistantPrompt";
import { ASSISTANT_PREFILLS } from "@/components/assistant/prefills";
import { FileManager } from "@/components/files/FileManager";
import type { ProjectFile } from "@/components/files/types";
import { EmptyState } from "@/components/ui/empty-state";
import { TourHelpButton } from "@/components/tour/TourHelpButton";
import { PageHeader } from "@/components/ui/page-header";
import { getAccountContext } from "@/lib/account-context";
import { sectionStackClass } from "@/lib/density";
import { projectWorkspaceEyebrow } from "@/lib/wedding-date";
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

  const [
    { data: notes },
    { data: fileRows },
    { data: project },
    {
      data: { user },
    },
    { data: acceptedInviteRows },
  ] = await Promise.all([
    supabase
      .from("notes")
      .select("id, title, body, updated_at, created_by, action_status")
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
    supabase.auth.getUser(),
    supabase
      .from("project_invitations")
      .select("email, accepted_by")
      .eq("project_id", projectId)
      .not("accepted_at", "is", null)
      .not("accepted_by", "is", null),
  ]);

  const emailByUserId = new Map<string, string>();
  for (const row of acceptedInviteRows ?? []) {
    if (row.accepted_by && row.email && !emailByUserId.has(row.accepted_by)) {
      emailByUserId.set(row.accepted_by, row.email);
    }
  }
  if (user?.id && user.email) {
    emailByUserId.set(user.id, user.email);
  }

  const noteList = sortNotes(
    ((notes ?? []) as Array<{
      id: string;
      title: string;
      body: string | null;
      updated_at: string;
      created_by: string | null;
      action_status: unknown;
    }>).map(
      (row): Note => ({
        id: row.id,
        title: row.title,
        body: row.body,
        updated_at: row.updated_at,
        created_by: row.created_by,
        action_status: parseActionStatus(row.action_status),
        author_email: row.created_by
          ? emailByUserId.get(row.created_by) || "Member"
          : "Assistant",
      }),
    ),
  );

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
  const eyebrow = projectWorkspaceEyebrow(projectName, weddingDate);

  return (
    <div className={stackClass}>
      <PageHeader
        eyebrow={eyebrow}
        title="Notes & files"
        description="Meeting notes, ideas, and documents for this wedding."
        actions={
          <div className="flex items-center gap-2">
            <TourHelpButton tourKey="notes" />
            <AddNoteButton projectId={projectId} />
          </div>
        }
      />

      <section className="space-y-4">
        <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
          Notes
        </p>
        {noteList.length === 0 ? (
          <EmptyState
            action={
              <AskAssistantPrompt
                prefill={ASSISTANT_PREFILLS.notes}
                title="Draft a planning note"
                description="I'll suggest a clear title and body with the key details."
                cta="Draft a note"
              />
            }
          >
            No notes yet. Add one to capture ideas.
          </EmptyState>
        ) : (
          <NotesBoard notes={noteList} />
        )}
      </section>

      <FileManager
        projectId={projectId}
        kind="file"
        files={fileList}
        label="Misc. Files"
        dataTour="notes-files"
      />
    </div>
  );
}
