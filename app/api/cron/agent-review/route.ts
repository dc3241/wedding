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
 *
 * EMAIL-BRAND-01: JSON synthesis (summary + highlights) + branded HTML shell;
 * venue own-brand via getOwnAccountBrandingForAccount (same VENUE-01 gate).
 */
import { NextResponse } from "next/server";
import { runAssistantWithTools } from "@/lib/assistant/call-assistant";
import {
  buildSynthesisSystemPrompt,
  SYNTHESIS_USER_TEXT,
} from "@/lib/assistant/synthesis-prompt";
import { getOwnAccountBrandingForAccount } from "@/lib/branding/get-branding";
import type { ProjectBranding } from "@/lib/branding/types";
import {
  accountKindFromEmbed,
  asOne,
  loadEligibleActiveProjects,
  type CronProjectRow,
} from "@/lib/cron/active-projects";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { resolveAccountEmails } from "@/lib/cron/resolve-account-emails";
import {
  renderBrandedDigestEmail,
  type DigestSection,
} from "@/lib/email/render-digest";
import { sendEmail } from "@/lib/email/send";
import { stripJsonFences } from "@/lib/inquiry/llm-json";
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

type SynthesisPayload = {
  summary: string;
  highlights: string[];
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

/** True when text looks like model JSON / fenced JSON — never put this in email. */
function looksLikeJsonDump(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.startsWith("```")) return true;
  return t.startsWith("{") && /["']summary["']\s*:/.test(t);
}

function normalizeHighlights(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === "string")) return null;
  return value
    .map((item) => (item as string).trim())
    .filter(Boolean)
    .slice(0, 5);
}

function asSynthesisObject(parsed: unknown): SynthesisPayload | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }
  const record = parsed as { summary?: unknown; highlights?: unknown };
  if (typeof record.summary !== "string") return null;
  const highlights = normalizeHighlights(record.highlights);
  if (!highlights) return null;
  return { summary: record.summary.trim(), highlights };
}

/**
 * Parse model final text as { summary, highlights }.
 * Strips markdown fences; never returns JSON/fenced dumps as summary prose.
 * On unrecoverable failure: empty summary (caller skips email section).
 */
function parseSynthesisPayload(raw: string): SynthesisPayload {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { summary: "", highlights: [] };
  }

  const candidates = Array.from(
    new Set([trimmed, stripJsonFences(trimmed)].filter(Boolean)),
  );

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      const outer = asSynthesisObject(parsed);
      if (!outer) continue;

      // Nested dump (e.g. prior fallback stored fenced JSON inside summary).
      if (looksLikeJsonDump(outer.summary)) {
        const inner = asSynthesisObject(
          JSON.parse(stripJsonFences(outer.summary)),
        );
        if (inner && !looksLikeJsonDump(inner.summary)) {
          return {
            summary: inner.summary,
            highlights:
              inner.highlights.length > 0 ? inner.highlights : outer.highlights,
          };
        }
        return { summary: "", highlights: [] };
      }

      return outer;
    } catch {
      // try next candidate / prose fallback
    }
  }

  // Plain prose only — never dump JSON-shaped text into the email body.
  if (looksLikeJsonDump(trimmed)) {
    return { summary: "", highlights: [] };
  }

  return { summary: trimmed, highlights: [] };
}

function serializeOkSummary(payload: SynthesisPayload): string {
  return JSON.stringify({
    summary: payload.summary,
    highlights: payload.highlights,
  });
}

async function loadOkSummariesThisWindow(
  supabase: ReturnType<typeof createServiceRoleClient>,
  projectIds: string[],
  windowStartIso: string,
): Promise<Map<string, SynthesisPayload>> {
  const byProject = new Map<string, SynthesisPayload>();
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
      const raw = row.summary?.trim();
      if (!raw) continue;
      const payload = parseSynthesisPayload(raw);
      if (!payload.summary) continue;
      byProject.set(row.project_id, payload);
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
  items: DigestSection[],
  branding?: ProjectBranding | null,
): { subject: string; text: string; html: string } {
  const subject =
    items.length === 1
      ? `${items[0]!.projectName} — this week`
      : "This week across your weddings";

  const textParts: string[] = [];
  for (const item of items) {
    textParts.push(item.projectName, item.summary);
    for (const highlight of item.highlights) {
      textParts.push(`- ${highlight}`);
    }
    textParts.push("");
  }

  const html = renderBrandedDigestEmail({
    title: subject,
    sections: items,
    branding: branding
      ? {
          brandName: branding.brandName,
          brandLogoUrl: branding.brandLogoUrl,
          brandAccentColor: branding.brandAccentColor,
        }
      : undefined,
  });

  return {
    subject,
    text: textParts.join("\n").trimEnd(),
    html,
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
      let payload: SynthesisPayload | null = null;

      if (result.ok && result.status === "completed") {
        const text = result.reply.trim();
        if (!text) {
          outcome = "error";
          summary = "empty synthesis";
        } else {
          payload = parseSynthesisPayload(text);
          if (!payload.summary) {
            outcome = "error";
            summary = "empty synthesis";
            payload = null;
          } else {
            outcome = "ok";
            summary = serializeOkSummary(payload);
          }
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

      if (outcome === "ok" && payload) {
        okSummaryByProject.set(project.id, payload);
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
      const items: DigestSection[] = [...accountProjects]
        .filter((project) => okSummaryByProject.has(project.id))
        .sort(compareWeddingDate)
        .map((project) => {
          const payload = okSummaryByProject.get(project.id)!;
          return {
            projectName: project.name,
            summary: payload.summary,
            highlights: payload.highlights,
          };
        })
        // Belt-and-suspenders: never ship JSON/fenced dumps into the email body.
        .filter(
          (item) => item.summary.length > 0 && !looksLikeJsonDump(item.summary),
        );

      if (items.length === 0) continue;

      const recipients = emailsByAccount.get(accountId) ?? [];
      if (recipients.length === 0) {
        errors.push(`account ${accountId}: no member emails`);
        continue;
      }

      let branding: ProjectBranding | null = null;
      try {
        branding = await getOwnAccountBrandingForAccount(supabase, accountId);
      } catch (err) {
        // Do not fail the digest — First Look defaults via the render helper.
        console.error(`agent-review branding ${accountId}:`, err);
        branding = null;
      }

      const digest = buildDigest(items, branding);
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
