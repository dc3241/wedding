/**
 * AGENT-03 — Vendor-outreach gap drafting.
 * Weekly scan. Propose-then-approve only — never sends from cron.
 * Own route: weekly, offset from AGENT-01 Monday 15:10 UTC.
 */
import { NextResponse } from "next/server";
import { runAssistantWithTools } from "@/lib/assistant/call-assistant";
import {
  buildOutreachSystemPrompt,
  buildOutreachUserText,
} from "@/lib/assistant/outreach-prompt";
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
import {
  isWithinOutreachWindow,
  loadOutreachCandidates,
} from "@/lib/cron/outreach-candidates";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TRIGGER_KIND = "outreach_scan" as const;

function queuedDrafts(
  pending: { name: WriteToolName; input: Record<string, unknown> }[],
): Record<string, unknown>[] {
  return pending
    .filter((write) => write.name === "create_agent_draft")
    .map((write) => write.input);
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
      (project) => {
        if (filterProjectId && project.id !== filterProjectId) return false;
        return isWithinOutreachWindow(project.wedding_date);
      },
    );

    if (filterProjectId && eligible.length === 0) {
      return NextResponse.json(
        { error: "Project not found or outside the 12-week window." },
        { status: 404 },
      );
    }

    const errors: string[] = [];
    let draftsCreated = 0;
    let nothingFound = 0;
    let skippedNoTargets = 0;
    let capped = 0;
    let errorCount = 0;

    for (const project of eligible) {
      const account = asOne(project.accounts);
      const startedAt = new Date().toISOString();
      const candidates = await loadOutreachCandidates(
        supabase,
        project.id,
        project.account_id,
      );

      if (candidates.length === 0) {
        const completedAt = new Date().toISOString();
        const { error: logError } = await supabase.from("agent_run_log").insert({
          project_id: project.id,
          trigger_kind: TRIGGER_KIND,
          outcome: "ok",
          summary: "nothing found",
          started_at: startedAt,
          completed_at: completedAt,
          acted_as_user_id: null,
        });
        if (logError) {
          errors.push(`project ${project.id}: log insert ${logError.message}`);
        }
        nothingFound += 1;
        skippedNoTargets += 1;
        continue;
      }

      const accountKind = accountKindFromEmbed(account?.kind);
      const result = await runAssistantWithTools(
        supabase,
        project.id,
        [],
        buildOutreachUserText(candidates),
        {
          projectName: project.name,
          weddingDate: project.wedding_date,
          accountKind,
        },
        {
          systemPrompt: buildOutreachSystemPrompt({
            projectName: project.name,
            weddingDate: project.wedding_date,
            accountKind,
          }),
          allowedWriteTools: ["create_agent_draft"],
          deferWrites: true,
        },
      );

      const completedAt = new Date().toISOString();
      let outcome: "ok" | "capped" | "error";
      let summary: string;
      let actedAsUserId: string | null = null;
      const queued = queuedDrafts(result.pendingWrites);
      const allowedIds = new Set(candidates.map((row) => row.vendor_id));

      if (
        result.status === "cap_hit" ||
        result.status === "cap_hit_with_side_effects"
      ) {
        outcome = "capped";
        summary = "capped — no draft created";
        capped += 1;
      } else if (!result.ok) {
        outcome = "error";
        summary = result.error || "outreach scan failed";
        errorCount += 1;
        errors.push(`project ${project.id}: ${summary}`);
      } else if (queued.length === 0) {
        outcome = "ok";
        summary = "nothing found";
        nothingFound += 1;
      } else {
        const createdIds: string[] = [];
        try {
          const userId = await resolveUnattendedActorUserId(
            project.account_id,
            supabase,
          );
          const seenTargets = new Set<string>();

          for (const input of queued) {
            const targetId =
              typeof input.target_id === "string" ? input.target_id.trim() : "";
            if (!targetId || !allowedIds.has(targetId) || seenTargets.has(targetId)) {
              continue;
            }
            seenTargets.add(targetId);

            const session = await mintUnattendedWriteSession(userId);
            const written = (await executeWriteTool(
              project.id,
              "create_agent_draft",
              input,
              session.client,
            )) as { success?: boolean; draft_id?: string; error?: string };

            if (written?.success === true && typeof written.draft_id === "string") {
              createdIds.push(written.draft_id);
            } else if (written?.error) {
              errors.push(`project ${project.id}: ${written.error}`);
            }
          }

          if (createdIds.length > 0) {
            outcome = "ok";
            summary = `drafted ${createdIds.length} outreach`;
            actedAsUserId = userId;
            draftsCreated += createdIds.length;
          } else {
            outcome = "ok";
            summary = "nothing found";
            nothingFound += 1;
          }
        } catch (writeErr) {
          outcome = "error";
          summary =
            writeErr instanceof Error
              ? writeErr.message
              : "create_agent_draft failed";
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
      draftsCreated,
      nothingFound,
      skippedNoTargets,
      capped,
      errorCount,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("agent-outreach-scan:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
