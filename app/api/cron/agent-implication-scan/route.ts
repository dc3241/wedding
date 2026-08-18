/**
 * AGENT-02 — Downstream-implication noticing.
 * Daily scan. In-app add_note only — never email, never agent_drafts.
 * Same CRON_SECRET bearer gate as AGENT-01. Own route because the
 * cadence differs (daily vs weekly).
 */
import { NextResponse } from "next/server";
import { runAssistantWithTools } from "@/lib/assistant/call-assistant";
import {
  buildImplicationSystemPrompt,
  IMPLICATION_USER_TEXT,
} from "@/lib/assistant/implication-prompt";
import {
  executeWriteTool,
  type WriteToolName,
} from "@/lib/assistant/write-tools";
import {
  mintUnattendedWriteSession,
  resolveUnattendedActorUserId,
} from "@/lib/assistant/unattended-write-session";
import {
  accountKindFromEmbed,
  asOne,
  loadEligibleActiveProjects,
} from "@/lib/cron/active-projects";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TRIGGER_KIND = "implication_scan" as const;

function firstQueuedAddNote(
  pending: { name: WriteToolName; input: Record<string, unknown> }[],
): Record<string, unknown> | null {
  const queued = pending.find((write) => write.name === "add_note");
  return queued?.input ?? null;
}

function noteSummary(input: Record<string, unknown>): string {
  const title =
    typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (title && body) return `${title}: ${body}`;
  return title || body || "implication note";
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  const filterProjectId = new URL(request.url).searchParams
    .get("projectId")
    ?.trim();

  const supabase = createServiceRoleClient();

  try {
    const eligible = (await loadEligibleActiveProjects(supabase)).filter(
      (project) => !filterProjectId || project.id === filterProjectId,
    );

    if (filterProjectId && eligible.length === 0) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const errors: string[] = [];
    let notesCreated = 0;
    let nothingFound = 0;
    let capped = 0;
    let errorCount = 0;

    for (const project of eligible) {
      const account = asOne(project.accounts);
      const accountKind = accountKindFromEmbed(account?.kind);
      const startedAt = new Date().toISOString();

      const result = await runAssistantWithTools(
        supabase,
        project.id,
        [],
        IMPLICATION_USER_TEXT,
        {
          projectName: project.name,
          weddingDate: project.wedding_date,
          accountKind,
        },
        {
          systemPrompt: buildImplicationSystemPrompt({
            projectName: project.name,
            weddingDate: project.wedding_date,
            accountKind,
          }),
          allowedWriteTools: ["add_note"],
          deferWrites: true,
        },
      );

      const completedAt = new Date().toISOString();
      let outcome: "ok" | "capped" | "error";
      let summary: string;
      let actedAsUserId: string | null = null;
      const queued = firstQueuedAddNote(result.pendingWrites);

      if (
        result.status === "cap_hit" ||
        result.status === "cap_hit_with_side_effects"
      ) {
        outcome = "capped";
        summary = "capped — no note created";
        capped += 1;
      } else if (!result.ok) {
        outcome = "error";
        summary = result.error || "implication scan failed";
        errorCount += 1;
        errors.push(`project ${project.id}: ${summary}`);
      } else if (!queued) {
        outcome = "ok";
        summary = "nothing found";
        nothingFound += 1;
      } else {
        try {
          const userId = await resolveUnattendedActorUserId(
            project.account_id,
            supabase,
          );
          const session = await mintUnattendedWriteSession(userId);
          const writeInput = {
            ...queued,
            action_status: "needs_action",
          };
          const written = (await executeWriteTool(
            project.id,
            "add_note",
            writeInput,
            session.client,
          )) as { success?: boolean; note_id?: string; error?: string };

          if (written?.success !== true || typeof written.note_id !== "string") {
            outcome = "error";
            summary = written?.error ?? "add_note failed";
            errorCount += 1;
            errors.push(`project ${project.id}: ${summary}`);
          } else {
            outcome = "ok";
            summary = noteSummary(writeInput);
            actedAsUserId = userId;
            notesCreated += 1;
          }
        } catch (writeErr) {
          outcome = "error";
          summary =
            writeErr instanceof Error ? writeErr.message : "add_note failed";
          errorCount += 1;
          errors.push(`project ${project.id}: ${summary}`);
        }
      }

      const { error: logError } = await supabase.from("agent_run_log").insert({
        project_id: project.id,
        trigger_kind: TRIGGER_KIND,
        outcome,
        summary,
        started_at: startedAt,
        completed_at: completedAt,
        acted_as_user_id: actedAsUserId,
      });

      if (logError) {
        errors.push(`project ${project.id}: log insert ${logError.message}`);
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      projectsProcessed: eligible.length,
      notesCreated,
      nothingFound,
      capped,
      errorCount,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("agent-implication-scan:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
