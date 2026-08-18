/**
 * AGENT-01 — Prioritized weekly synthesis.
 * Extends AGENT-00's dispatcher. Same CRON_SECRET bearer gate.
 *
 * Autonomous send-to-self: the digest reaches the account owner(s), not a
 * third party. That is not precedent for AGENT-03 / AUTO-03, which stay
 * propose-then-approve.
 *
 * Read-only: the loop is invoked with readOnly:true — write tools are
 * neither advertised nor executed.
 */
import { NextResponse } from "next/server";
import { runAssistantWithTools } from "@/lib/assistant/call-assistant";
import {
  buildSynthesisSystemPrompt,
  SYNTHESIS_USER_TEXT,
} from "@/lib/assistant/synthesis-prompt";
import {
  accountKindFromEmbed,
  asOne,
  loadEligibleActiveProjects,
  type CronProjectRow,
} from "@/lib/cron/active-projects";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { resolveAccountEmails } from "@/lib/cron/resolve-account-emails";
import { sendEmail } from "@/lib/email/send";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PROJECT_PAGE_SIZE = 500;
const TRIGGER_KIND = "synthesis" as const;
/** Duplicate Vercel Cron delivery window — not a weekly-dedup of facts. */
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000;

type OkLogRow = {
  project_id: string;
  summary: string | null;
};

/** Same convention as dashboard: soonest wedding first, undated last. */
function compareWeddingDate(a: CronProjectRow, b: CronProjectRow): number {
  if (a.wedding_date !== b.wedding_date) {
    if (a.wedding_date == null) return 1;
    if (b.wedding_date == null) return -1;
    return a.wedding_date.localeCompare(b.wedding_date);
  }
  if (a.created_at !== b.created_at) {
    return a.created_at.localeCompare(b.created_at);
  }
  return a.id.localeCompare(b.id);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadOkSummariesThisWindow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  projectIds: string[],
  windowStartIso: string,
): Promise<Map<string, string>> {
  const byProject = new Map<string, string>();
  if (projectIds.length === 0) return byProject;

  for (let i = 0; i < projectIds.length; i += PROJECT_PAGE_SIZE) {
    const chunk = projectIds.slice(i, i + PROJECT_PAGE_SIZE);
    const { data, error } = await supabase
      .from("agent_run_log")
      .select("project_id, summary")
      .eq("trigger_kind", TRIGGER_KIND)
      .eq("outcome", "ok")
      .gte("started_at", windowStartIso)
      .in("project_id", chunk);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as OkLogRow[]) {
      const summary = row.summary?.trim();
      if (!summary) continue;
      byProject.set(row.project_id, summary);
    }
  }

  return byProject;
}

async function writeRunLog(
  supabase: ReturnType<typeof createServiceRoleClient>,
  row: {
    project_id: string;
    outcome: "ok" | "capped" | "error";
    summary: string;
    started_at: string;
    completed_at: string;
  },
): Promise<string | null> {
  const { error } = await supabase.from("agent_run_log").insert({
    project_id: row.project_id,
    trigger_kind: TRIGGER_KIND,
    outcome: row.outcome,
    summary: row.summary,
    started_at: row.started_at,
    completed_at: row.completed_at,
  });
  return error ? error.message : null;
}

function buildDigest(
  items: { projectName: string; summary: string }[],
): { subject: string; text: string; html: string } {
  const subject =
    items.length === 1
      ? `${items[0]!.projectName} — this week`
      : "This week across your weddings";

  const textParts: string[] = [];
  const htmlParts: string[] = [];

  for (const item of items) {
    textParts.push(item.projectName, item.summary, "");
    htmlParts.push(
      `<p><strong>${escapeHtml(item.projectName)}</strong></p>`,
      `<p>${escapeHtml(item.summary)}</p>`,
    );
  }

  return {
    subject,
    text: textParts.join("\n").trimEnd(),
    html: htmlParts.join(""),
  };
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return unauthorizedCronResponse();
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const supabase = createServiceRoleClient();
  const windowStartIso = new Date(Date.now() - RETRY_WINDOW_MS).toISOString();

  try {
    const eligible = await loadEligibleActiveProjects(supabase);

    const okSummaryByProject = await loadOkSummariesThisWindow(
      supabase,
      eligible.map((project) => project.id),
      windowStartIso,
    );

    const accountsWithNewOk = new Set<string>();
    const errors: string[] = [];
    let skippedRetrySafe = 0;
    let synthesesProduced = 0;
    let capped = 0;
    let errorCount = 0;

    for (const project of eligible) {
      if (okSummaryByProject.has(project.id)) {
        skippedRetrySafe += 1;
        continue;
      }

      const account = asOne(project.accounts);
      const accountKind = accountKindFromEmbed(account?.kind);
      const startedAt = new Date().toISOString();

      const result = await runAssistantWithTools(
        supabase,
        project.id,
        [],
        SYNTHESIS_USER_TEXT,
        {
          projectName: project.name,
          weddingDate: project.wedding_date,
          accountKind,
        },
        {
          systemPrompt: buildSynthesisSystemPrompt({
            projectName: project.name,
            weddingDate: project.wedding_date,
            accountKind,
          }),
          readOnly: true,
        },
      );

      const completedAt = new Date().toISOString();
      let outcome: "ok" | "capped" | "error";
      let summary: string;

      if (result.ok && result.status === "completed") {
        const text = result.reply.trim();
        if (!text) {
          outcome = "error";
          summary = "empty synthesis";
        } else {
          outcome = "ok";
          summary = text;
        }
      } else if (
        result.status === "cap_hit" ||
        result.status === "cap_hit_with_side_effects"
      ) {
        outcome = "capped";
        summary = "capped — no synthesis produced";
      } else {
        outcome = "error";
        summary =
          ("error" in result && result.error) || "synthesis failed";
      }

      const logError = await writeRunLog(supabase, {
        project_id: project.id,
        outcome,
        summary,
        started_at: startedAt,
        completed_at: completedAt,
      });
      if (logError) {
        errors.push(`project ${project.id}: log insert ${logError}`);
      }

      if (outcome === "ok") {
        okSummaryByProject.set(project.id, summary);
        accountsWithNewOk.add(project.account_id);
        synthesesProduced += 1;
      } else if (outcome === "capped") {
        capped += 1;
      } else {
        errorCount += 1;
        errors.push(`project ${project.id}: ${summary}`);
      }
    }

    const emailsByAccount = await resolveAccountEmails(supabase, [
      ...accountsWithNewOk,
    ]);

    let digestsSent = 0;
    const byAccount = new Map<string, CronProjectRow[]>();
    for (const project of eligible) {
      if (!accountsWithNewOk.has(project.account_id)) continue;
      const list = byAccount.get(project.account_id) ?? [];
      list.push(project);
      byAccount.set(project.account_id, list);
    }

    for (const [accountId, accountProjects] of byAccount) {
      const items = [...accountProjects]
        .filter((project) => okSummaryByProject.has(project.id))
        .sort(compareWeddingDate)
        .map((project) => ({
          projectName: project.name,
          summary: okSummaryByProject.get(project.id)!,
        }));

      if (items.length === 0) continue;

      const recipients = emailsByAccount.get(accountId) ?? [];
      if (recipients.length === 0) {
        errors.push(`account ${accountId}: no member emails`);
        continue;
      }

      const digest = buildDigest(items);
      const sent = await sendEmail({
        to: recipients,
        subject: digest.subject,
        text: digest.text,
        html: digest.html,
      });

      if (!sent.ok) {
        errors.push(`account ${accountId}: ${sent.error}`);
        continue;
      }

      digestsSent += 1;
    }

    return NextResponse.json({
      ok: errors.length === 0,
      projectsProcessed: eligible.length,
      synthesesProduced,
      skippedRetrySafe,
      digestsSent,
      capped,
      errorCount,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("agent-review:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
