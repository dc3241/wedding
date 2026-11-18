/**
 * RSVP-AUTO-01 — daily: when a published wedding's RSVP deadline is 3 weeks
 * (d21) or 1 week (d7) away, queue the existing rsvp_reminder proposal for
 * households that haven't answered, then email the couple that it's ready.
 * Guests are NOT emailed here: the couple taps Send reminders (propose-then-
 * approve). Rule-based, no LLM. Each round fires once per deadline
 * (wedding_websites.rsvp_chase_sent; reset when the deadline changes).
 */
import { NextResponse } from "next/server";
import { createRsvpReminderProposal, DEFAULT_RSVP_MESSAGE } from "@/lib/assistant/proposals";
import {
  mintUnattendedWriteSession,
  resolveUnattendedActorUserId,
} from "@/lib/assistant/unattended-write-session";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { resolveAccountEmails } from "@/lib/cron/resolve-account-emails";
import { sendEmail } from "@/lib/email/send";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_SITES_PER_RUN = 60;
type Round = "d21" | "d7";

function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function daysBetween(fromKey: string, toKey: string): number {
  const from = Date.UTC(+fromKey.slice(0, 4), +fromKey.slice(5, 7) - 1, +fromKey.slice(8, 10));
  const to = Date.UTC(+toKey.slice(0, 4), +toKey.slice(5, 7) - 1, +toKey.slice(8, 10));
  return Math.round((to - from) / 86_400_000);
}

function dueRound(daysLeft: number, sent: string[]): Round | null {
  if (daysLeft < 0) return null;
  if (daysLeft <= 7) return sent.includes("d7") ? null : "d7";
  if (daysLeft <= 21) return sent.includes("d21") ? null : "d21";
  return null;
}

function formatDate(key: string): string {
  const d = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10)));
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return unauthorizedCronResponse();

  const admin = createServiceRoleClient();
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "America/Phoenix" });
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.usefirstlook.app").replace(/\/$/, "");

  const { data: sites, error } = await admin
    .from("wedding_websites")
    .select(
      "project_id, rsvp_deadline, rsvp_chase_sent, projects!inner ( id, name, account_id, archived_at, accounts!inner ( is_demo ) )",
    )
    .eq("published", true)
    .not("rsvp_deadline", "is", null)
    .gte("rsvp_deadline", todayKey)
    .limit(500);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const results: Record<string, string> = {};
  let processed = 0;

  for (const site of sites ?? []) {
    if (processed >= MAX_SITES_PER_RUN) break;
    const project = one(site.projects as unknown as {
      id: string;
      name: string;
      account_id: string;
      archived_at: string | null;
      accounts: { is_demo: boolean } | { is_demo: boolean }[] | null;
    });
    if (!project || project.archived_at || one(project.accounts)?.is_demo) continue;

    const deadline = site.rsvp_deadline as string;
    const sent = (site.rsvp_chase_sent as string[] | null) ?? [];
    const round = dueRound(daysBetween(todayKey, deadline), sent);
    if (!round) continue;
    processed += 1;

    const markSent = async () => {
      await admin
        .from("wedding_websites")
        .update({ rsvp_chase_sent: Array.from(new Set([...sent, round])) })
        .eq("project_id", project.id);
    };

    // Don't stack a second reminder on one the couple hasn't acted on.
    const { data: pending } = await admin
      .from("assistant_proposals")
      .select("id")
      .eq("project_id", project.id)
      .eq("kind", "rsvp_reminder")
      .eq("status", "pending")
      .limit(1);
    if (pending && pending.length > 0) {
      await markSent();
      results[project.id] = `${round}:already_pending`;
      continue;
    }

    try {
      const actor = await resolveUnattendedActorUserId(project.account_id, admin);
      const session = await mintUnattendedWriteSession(actor);
      const created = await createRsvpReminderProposal(
        project.id,
        { message: `${DEFAULT_RSVP_MESSAGE} Please RSVP by ${formatDate(deadline)}.` },
        session.client,
      );
      if (!created.ok) {
        // "Nobody to email" / "everyone answered" are final for this round.
        await markSent();
        results[project.id] = `${round}:skipped`;
        continue;
      }
      await markSent();
      results[project.id] = `${round}:queued(${created.recipientCount})`;

      const emails = (await resolveAccountEmails(admin, [project.account_id])).get(
        project.account_id,
      );
      if (emails && emails.length > 0) {
        const n = created.recipientCount;
        const link = `${origin}/projects/${project.id}/guests`;
        const lead = `${n} ${n === 1 ? "household hasn't" : "households haven't"} RSVP'd yet, and your deadline is ${formatDate(deadline)}.`;
        const action =
          "We drafted a friendly reminder for them. Open First Look, then the assistant's Pending list, and tap Send reminders. Nothing goes to guests until you do.";
        await sendEmail({
          to: emails,
          subject: `RSVP reminder ready for ${n} ${n === 1 ? "household" : "households"}`,
          text: `${lead}\n\n${action}\n\n${link}`,
          html: `<p>${escapeHtml(lead)}</p><p>${escapeHtml(action)}</p><p><a href="${link}">Review the reminder</a></p>`,
        }).catch(() => undefined);
      }
    } catch (err) {
      // Leave the round unmarked so tomorrow's run retries.
      results[project.id] = `${round}:error`;
      console.error("[rsvp-chase]", project.id, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ ok: true, processed, results });
}
