/**
 * AUTO-02 — Countdown Confirmations.
 * Sibling of AUTO-01's payment-schedule-watch. Same CRON_SECRET + Resend helper.
 * Cadence (T-30 / T-7 / T-2) lives only here — no recurring nag after T-2.
 */
import { NextResponse } from "next/server";
import {
  parseLocalDateKey,
  toLocalDateKey,
} from "@/app/(app)/calendar/calendar-source";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { sendEmail } from "@/lib/email/send";
import { formatTimeOfDay } from "@/lib/timeline-aggregates";
import { vendorConfirmUrl } from "@/lib/vendors/confirm-url";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DUE_30_DAYS = 30;
const DUE_7_DAYS = 7;
const DUE_2_DAYS = 2;

const PROJECT_PAGE_SIZE = 500;

type ReminderKind = "due_30" | "due_7" | "due_2";

type VendorEmbed = {
  name: string;
  contact_email: string | null;
};

type ProjectVendorRow = {
  id: string;
  status: string;
  arrival_time: string | null;
  scope_note: string | null;
  confirm_token: string;
  last_reminder_kind: ReminderKind | null;
  confirmed_at: string | null;
  vendors: VendorEmbed | VendorEmbed[] | null;
};

type AccountEmbed = { id: string; is_demo: boolean };

type ProjectRow = {
  id: string;
  name: string;
  wedding_date: string | null;
  account_id: string;
  accounts: AccountEmbed | AccountEmbed[] | null;
  project_vendors: ProjectVendorRow[] | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Same local-key arithmetic as AUTO-01 / dashboard `daysUntil`. */
function calendarDaysUntil(dueOn: string, todayKey: string): number {
  return Math.round(
    (parseLocalDateKey(dueOn).getTime() -
      parseLocalDateKey(todayKey).getTime()) /
      86_400_000,
  );
}

function kindForDaysUntil(daysUntil: number): ReminderKind | null {
  if (daysUntil === DUE_30_DAYS) return "due_30";
  if (daysUntil === DUE_7_DAYS) return "due_7";
  if (daysUntil === DUE_2_DAYS) return "due_2";
  return null;
}

function kindLabel(kind: ReminderKind): string {
  if (kind === "due_30") return "30 days";
  if (kind === "due_7") return "7 days";
  return "2 days";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function loadDatedActiveProjects(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<ProjectRow[]> {
  const rows: ProjectRow[] = [];
  let from = 0;

  for (;;) {
    const to = from + PROJECT_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("projects")
      .select(
        `
        id,
        name,
        wedding_date,
        account_id,
        accounts!inner(id, is_demo),
        project_vendors(
          id,
          status,
          arrival_time,
          scope_note,
          confirm_token,
          last_reminder_kind,
          confirmed_at,
          vendors(name, contact_email)
        )
      `,
      )
      .is("archived_at", null)
      .eq("accounts.is_demo", false)
      .not("wedding_date", "is", null)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as ProjectRow[];
    rows.push(...page);
    if (page.length < PROJECT_PAGE_SIZE) break;
    from += PROJECT_PAGE_SIZE;
  }

  return rows;
}

function buildReminderEmail(args: {
  vendorName: string;
  weddingName: string;
  kind: ReminderKind;
  arrivalTime: string;
  scopeNote: string | null;
  link: string;
}): { subject: string; text: string; html: string } {
  const when = kindLabel(args.kind);
  const arrival = formatTimeOfDay(args.arrivalTime);
  const scope = args.scopeNote?.trim() || null;
  const subject = `${args.weddingName} is in ${when} — please confirm`;

  const textLines = [
    `Hi ${args.vendorName},`,
    "",
    `${args.weddingName} is in ${when}.`,
    "",
    `Arrival: ${arrival}`,
  ];
  if (scope) textLines.push(`Scope: ${scope}`);
  textLines.push("", `Please confirm you're set: ${args.link}`, "");

  const htmlParts = [
    `<p>Hi ${escapeHtml(args.vendorName)},</p>`,
    `<p>${escapeHtml(args.weddingName)} is in ${escapeHtml(when)}.</p>`,
    `<p><strong>Arrival:</strong> ${escapeHtml(arrival)}</p>`,
  ];
  if (scope) {
    htmlParts.push(`<p><strong>Scope:</strong> ${escapeHtml(scope)}</p>`);
  }
  htmlParts.push(
    `<p><a href="${escapeHtml(args.link)}">Confirm you're set</a></p>`,
  );

  return { subject, text: textLines.join("\n"), html: htmlParts.join("") };
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

  const todayKey = toLocalDateKey(new Date());
  const supabase = createServiceRoleClient();

  try {
    const projects = await loadDatedActiveProjects(supabase);

    let remindersSent = 0;
    let skippedDeduped = 0;
    let skippedNoEmail = 0;
    let skippedNoArrival = 0;
    let skippedConfirmed = 0;
    let skippedNotBooked = 0;
    const errors: string[] = [];

    for (const project of projects) {
      const account = asOne(project.accounts);
      if (!account || account.is_demo) continue;
      if (!project.wedding_date) continue;

      const daysUntil = calendarDaysUntil(project.wedding_date, todayKey);
      const kind = kindForDaysUntil(daysUntil);
      if (!kind) continue;

      for (const row of project.project_vendors ?? []) {
        // Live status — un-booking stops reminders without deleting history.
        if (row.status !== "booked") {
          skippedNotBooked += 1;
          continue;
        }

        if (row.confirmed_at) {
          skippedConfirmed += 1;
          continue;
        }

        if (row.last_reminder_kind === kind) {
          skippedDeduped += 1;
          continue;
        }

        const vendor = asOne(row.vendors);
        const email = vendor?.contact_email?.trim() ?? "";
        if (!vendor || !email) {
          skippedNoEmail += 1;
          console.info(
            "countdown-confirmations: skip no email",
            project.id,
            row.id,
          );
          continue;
        }

        if (!row.arrival_time) {
          skippedNoArrival += 1;
          console.info(
            "countdown-confirmations: skip no arrival_time",
            project.id,
            row.id,
          );
          continue;
        }

        const digest = buildReminderEmail({
          vendorName: vendor.name,
          weddingName: project.name,
          kind,
          arrivalTime: row.arrival_time,
          scopeNote: row.scope_note,
          link: vendorConfirmUrl(row.confirm_token),
        });

        const sent = await sendEmail({
          to: email,
          subject: digest.subject,
          text: digest.text,
          html: digest.html,
        });

        if (!sent.ok) {
          errors.push(`project_vendor ${row.id}: ${sent.error}`);
          continue;
        }

        const { error: updateError } = await supabase
          .from("project_vendors")
          .update({
            last_reminder_sent_at: new Date().toISOString(),
            last_reminder_kind: kind,
          })
          .eq("id", row.id);

        if (updateError) {
          errors.push(
            `project_vendor ${row.id}: reminder update ${updateError.message}`,
          );
        }

        remindersSent += 1;
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      today: todayKey,
      remindersSent,
      skippedDeduped,
      skippedNoEmail,
      skippedNoArrival,
      skippedConfirmed,
      skippedNotBooked,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("countdown-confirmations:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
