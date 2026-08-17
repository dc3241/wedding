/**
 * AUTO-01 — Payment Schedule Watch.
 * Vercel Cron → this route. Auth is CRON_SECRET bearer only.
 * UI for "reminders sent" / digest frequency is deferred.
 */
import { NextResponse } from "next/server";
import {
  parseLocalDateKey,
  toLocalDateKey,
} from "@/app/(app)/calendar/calendar-source";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { resolveAccountEmails } from "@/lib/cron/resolve-account-emails";
import { deriveScheduleWaterfall } from "@/lib/budget-aggregates";
import { sendEmail } from "@/lib/email/send";
import { formatCurrency } from "@/lib/format-currency";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cadence lives only here — same posture as RSVP-THROTTLE-01.
const DUE_7_DAYS = 7;
const DUE_2_DAYS = 2;
const OVERDUE_RECURRING_EVERY_DAYS = 5;

const PROJECT_PAGE_SIZE = 500;

type ReminderKind = "due_7" | "due_2" | "overdue_first" | "overdue_recurring";

type ScheduleRow = {
  id: string;
  budget_item_id: string;
  amount: number | string;
  due_on: string;
  label: string | null;
};

type PaymentRow = {
  budget_item_id: string;
  amount: number | string;
};

type ItemRow = {
  id: string;
  label: string | null;
};

type AccountEmbed = { id: string; is_demo: boolean };

type ProjectRow = {
  id: string;
  name: string;
  account_id: string;
  accounts: AccountEmbed | AccountEmbed[] | null;
  payment_schedule: ScheduleRow[] | null;
  budget_payments: PaymentRow[] | null;
  budget_items: ItemRow[] | null;
};

type LogRow = {
  payment_schedule_id: string;
  reminder_kind: ReminderKind;
  sent_at: string;
};

type PendingReminder = {
  paymentScheduleId: string;
  projectId: string;
  projectName: string;
  accountId: string;
  amount: number;
  dueOn: string;
  label: string | null;
  itemLabel: string | null;
  kind: ReminderKind;
  daysUntil: number;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Same local-key arithmetic as dashboard `daysUntil` (Budget `toLocalDateKey`). */
function calendarDaysUntil(dueOn: string, todayKey: string): number {
  return Math.round(
    (parseLocalDateKey(dueOn).getTime() -
      parseLocalDateKey(todayKey).getTime()) /
      86_400_000,
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDueOn(dueOn: string): string {
  return parseLocalDateKey(dueOn).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function installmentTitle(item: PendingReminder): string {
  const itemLabel = item.itemLabel?.trim() || "Untitled";
  const scheduleLabel = item.label?.trim();
  return scheduleLabel ? `${itemLabel} — ${scheduleLabel}` : itemLabel;
}

function kindLine(item: PendingReminder): string {
  if (item.kind === "due_7") return "Due in 7 days";
  if (item.kind === "due_2") return "Due in 2 days";
  const daysOverdue = Math.abs(item.daysUntil);
  return daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`;
}

function oneshotAlreadySent(
  logs: LogRow[],
  kind: Extract<ReminderKind, "due_7" | "due_2" | "overdue_first">,
): boolean {
  return logs.some((row) => row.reminder_kind === kind);
}

function overdueRecurringReady(logs: LogRow[], todayKey: string): boolean {
  const first = logs.find((row) => row.reminder_kind === "overdue_first");
  if (!first) return false;

  const lastRecurring = logs
    .filter((row) => row.reminder_kind === "overdue_recurring")
    .sort((a, b) => b.sent_at.localeCompare(a.sent_at))[0];

  const anchor = lastRecurring ?? first;
  const lastKey = toLocalDateKey(new Date(anchor.sent_at));
  return calendarDaysUntil(todayKey, lastKey) >= OVERDUE_RECURRING_EVERY_DAYS;
}

function classifyUncovered(args: {
  installment: {
    id: string;
    amount: number;
    due_on: string;
    label: string | null;
  };
  logs: LogRow[];
  todayKey: string;
}): ReminderKind | null {
  const daysUntil = calendarDaysUntil(args.installment.due_on, args.todayKey);

  if (daysUntil === DUE_7_DAYS) {
    return oneshotAlreadySent(args.logs, "due_7") ? null : "due_7";
  }
  if (daysUntil === DUE_2_DAYS) {
    return oneshotAlreadySent(args.logs, "due_2") ? null : "due_2";
  }
  if (daysUntil < 0) {
    if (!oneshotAlreadySent(args.logs, "overdue_first")) {
      return "overdue_first";
    }
    return overdueRecurringReady(args.logs, args.todayKey)
      ? "overdue_recurring"
      : null;
  }
  return null;
}

async function loadActiveNonDemoProjects(
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
        account_id,
        accounts!inner(id, is_demo),
        payment_schedule(id, budget_item_id, amount, due_on, label),
        budget_payments(budget_item_id, amount),
        budget_items(id, label)
      `,
      )
      .is("archived_at", null)
      .eq("accounts.is_demo", false)
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

async function loadReminderLogs(
  supabase: ReturnType<typeof createServiceRoleClient>,
  scheduleIds: string[],
): Promise<Map<string, LogRow[]>> {
  const bySchedule = new Map<string, LogRow[]>();
  if (scheduleIds.length === 0) return bySchedule;

  const chunkSize = 200;
  for (let i = 0; i < scheduleIds.length; i += chunkSize) {
    const chunk = scheduleIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("payment_reminder_log")
      .select("payment_schedule_id, reminder_kind, sent_at")
      .in("payment_schedule_id", chunk);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as LogRow[]) {
      const list = bySchedule.get(row.payment_schedule_id) ?? [];
      list.push(row);
      bySchedule.set(row.payment_schedule_id, list);
    }
  }

  return bySchedule;
}

function collectPending(
  projects: ProjectRow[],
  logsBySchedule: Map<string, LogRow[]>,
  todayKey: string,
): { pending: PendingReminder[]; skippedDeduped: number } {
  const pending: PendingReminder[] = [];
  let skippedDeduped = 0;

  for (const project of projects) {
    const account = asOne(project.accounts);
    if (!account || account.is_demo) continue;

    const items = project.budget_items ?? [];
    const payments = project.budget_payments ?? [];
    const scheduleRows = project.payment_schedule ?? [];
    if (scheduleRows.length === 0) continue;

    const itemLabelById = new Map(items.map((item) => [item.id, item.label]));

    const paidByItem = new Map<string, number>();
    for (const payment of payments) {
      paidByItem.set(
        payment.budget_item_id,
        (paidByItem.get(payment.budget_item_id) ?? 0) + Number(payment.amount),
      );
    }

    const scheduleByItem = new Map<string, ScheduleRow[]>();
    for (const row of scheduleRows) {
      const list = scheduleByItem.get(row.budget_item_id) ?? [];
      list.push(row);
      scheduleByItem.set(row.budget_item_id, list);
    }

    for (const [itemId, installments] of scheduleByItem) {
      const { schedule } = deriveScheduleWaterfall(
        installments.map((row) => ({
          id: row.id,
          budget_item_id: row.budget_item_id,
          amount: Number(row.amount),
          due_on: row.due_on,
          label: row.label,
        })),
        paidByItem.get(itemId) ?? 0,
        todayKey,
      );

      for (const installment of schedule) {
        if (installment.covered) continue;

        const logs = logsBySchedule.get(installment.id) ?? [];
        const kind = classifyUncovered({ installment, logs, todayKey });
        if (!kind) {
          const daysUntil = calendarDaysUntil(installment.due_on, todayKey);
          const onCadence =
            daysUntil === DUE_7_DAYS ||
            daysUntil === DUE_2_DAYS ||
            daysUntil < 0;
          if (onCadence) skippedDeduped += 1;
          continue;
        }

        pending.push({
          paymentScheduleId: installment.id,
          projectId: project.id,
          projectName: project.name,
          accountId: project.account_id,
          amount: installment.amount,
          dueOn: installment.due_on,
          label: installment.label,
          itemLabel: itemLabelById.get(itemId) ?? null,
          kind,
          daysUntil: calendarDaysUntil(installment.due_on, todayKey),
        });
      }
    }
  }

  return { pending, skippedDeduped };
}

function buildDigest(items: PendingReminder[]): { subject: string; text: string; html: string } {
  const sorted = [...items].sort((a, b) => {
    if (a.projectName !== b.projectName) {
      return a.projectName.localeCompare(b.projectName);
    }
    if (a.dueOn !== b.dueOn) return a.dueOn.localeCompare(b.dueOn);
    return a.paymentScheduleId.localeCompare(b.paymentScheduleId);
  });

  const hasOverdue = sorted.some((item) => item.daysUntil < 0);
  const hasUpcoming = sorted.some((item) => item.daysUntil >= 0);
  const subject =
    hasOverdue && hasUpcoming
      ? "Upcoming and overdue payments"
      : hasOverdue
        ? "Overdue payments"
        : "Upcoming payments";

  const groups = new Map<string, PendingReminder[]>();
  for (const item of sorted) {
    const list = groups.get(item.projectId) ?? [];
    list.push(item);
    groups.set(item.projectId, list);
  }

  const textParts: string[] = [
    "These payment-schedule installments need attention:",
    "",
  ];
  const htmlParts: string[] = [
    "<p>These payment-schedule installments need attention:</p>",
  ];

  for (const group of groups.values()) {
    const projectName = group[0]!.projectName;
    textParts.push(projectName);
    htmlParts.push(`<p><strong>${escapeHtml(projectName)}</strong></p><ul>`);
    for (const item of group) {
      const line = `${installmentTitle(item)} — ${formatCurrency(item.amount)} — ${formatDueOn(item.dueOn)} (${kindLine(item)})`;
      textParts.push(`- ${line}`);
      htmlParts.push(`<li>${escapeHtml(line)}</li>`);
    }
    textParts.push("");
    htmlParts.push("</ul>");
  }

  textParts.push("Open First Look to mark them paid.");
  htmlParts.push("<p>Open First Look to mark them paid.</p>");

  return { subject, text: textParts.join("\n"), html: htmlParts.join("") };
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
    const projects = await loadActiveNonDemoProjects(supabase);

    const uncoveredIds: string[] = [];
    for (const project of projects) {
      for (const row of project.payment_schedule ?? []) {
        uncoveredIds.push(row.id);
      }
    }

    const logsBySchedule = await loadReminderLogs(supabase, uncoveredIds);
    const { pending, skippedDeduped } = collectPending(
      projects,
      logsBySchedule,
      todayKey,
    );

    const byAccount = new Map<string, PendingReminder[]>();
    for (const item of pending) {
      const list = byAccount.get(item.accountId) ?? [];
      list.push(item);
      byAccount.set(item.accountId, list);
    }

    const emailsByAccount = await resolveAccountEmails(supabase, [
      ...byAccount.keys(),
    ]);

    let accountsNotified = 0;
    let remindersSent = 0;
    let emailsSent = 0;
    const errors: string[] = [];

    for (const [accountId, items] of byAccount) {
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

      const { error: insertError } = await supabase
        .from("payment_reminder_log")
        .insert(
          items.map((item) => ({
            payment_schedule_id: item.paymentScheduleId,
            project_id: item.projectId,
            reminder_kind: item.kind,
          })),
        );

      if (insertError) {
        errors.push(`account ${accountId}: log insert ${insertError.message}`);
      }

      accountsNotified += 1;
      remindersSent += items.length;
      emailsSent += 1;
    }

    return NextResponse.json({
      ok: errors.length === 0,
      today: todayKey,
      accountsNotified,
      remindersSent,
      emailsSent,
      skippedDeduped,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("payment-schedule-watch:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
