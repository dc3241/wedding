/**
 * INVOICE-03 — Invoice schedule watch.
 * Sibling of AUTO-01 (payment-schedule-watch). Daily Vercel Cron.
 * Uncovered invoice installments → client reminder when email is set,
 * plus a planner digest. First Look never says it collected money.
 */
import { NextResponse } from "next/server";
import {
  parseLocalDateKey,
  toLocalDateKey,
} from "@/app/(app)/calendar/calendar-source";
import { cronAuthorized, unauthorizedCronResponse } from "@/lib/cron/authorize";
import { resolveAccountEmails } from "@/lib/cron/resolve-account-emails";
import { sendEmail } from "@/lib/email/send";
import { sendEmailBestEffort } from "@/lib/email/send-best-effort";
import { formatInvoiceMoney, invoiceRemaining, invoiceTotal } from "@/lib/invoices/money";
import { deriveInvoiceSchedule } from "@/lib/invoices/schedule";
import { invoicePublicUrl } from "@/lib/invoices/url";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DUE_7_DAYS = 7;
const DUE_TODAY = 0;
const OVERDUE_RECURRING_EVERY_DAYS = 5;
const PAGE_SIZE = 500;

type ReminderKind = "due_7" | "due_0" | "overdue_first" | "overdue_recurring";

type AccountEmbed = { id: string; is_demo: boolean };
type ProjectEmbed = { id: string; name: string; archived_at: string | null };

type InvoiceRow = {
  id: string;
  account_id: string;
  project_id: string;
  client_name: string | null;
  client_email: string | null;
  status: string;
  access_token: string;
  accounts: AccountEmbed | AccountEmbed[] | null;
  projects: ProjectEmbed | ProjectEmbed[] | null;
  invoice_schedule:
    | {
        id: string;
        amount: number | string;
        due_on: string;
        label: string | null;
        created_at: string;
      }[]
    | null;
  invoice_line_items: { amount: number | string }[] | null;
  invoice_payments: { amount: number | string }[] | null;
};

type LogRow = {
  invoice_schedule_id: string;
  reminder_kind: ReminderKind;
  sent_at: string;
};

type PendingReminder = {
  scheduleId: string;
  invoiceId: string;
  projectId: string;
  projectName: string;
  accountId: string;
  clientName: string;
  clientEmail: string | null;
  publicUrl: string;
  amount: number;
  remaining: number;
  dueOn: string;
  label: string | null;
  kind: ReminderKind;
  daysUntil: number;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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

function oneshotAlreadySent(logs: LogRow[], kind: ReminderKind): boolean {
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
  dueOn: string;
  logs: LogRow[];
  todayKey: string;
}): ReminderKind | null {
  const daysUntil = calendarDaysUntil(args.dueOn, args.todayKey);

  if (daysUntil === DUE_7_DAYS) {
    return oneshotAlreadySent(args.logs, "due_7") ? null : "due_7";
  }
  if (daysUntil === DUE_TODAY) {
    return oneshotAlreadySent(args.logs, "due_0") ? null : "due_0";
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

function kindLine(item: PendingReminder): string {
  if (item.kind === "due_7") return "Due in 7 days";
  if (item.kind === "due_0") return "Due today";
  const daysOverdue = Math.abs(item.daysUntil);
  return daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`;
}

function installmentTitle(item: PendingReminder): string {
  return item.label?.trim() || "Installment";
}

async function loadIssuedInvoices(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<InvoiceRow[]> {
  const rows: InvoiceRow[] = [];
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("invoices")
      .select(
        `
        id,
        account_id,
        project_id,
        client_name,
        client_email,
        status,
        access_token,
        accounts!inner(id, is_demo),
        projects!inner(id, name, archived_at),
        invoice_schedule(id, amount, due_on, label, created_at),
        invoice_line_items(amount),
        invoice_payments(amount)
      `,
      )
      .in("status", ["sent", "partial"])
      .eq("accounts.is_demo", false)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data ?? []) as InvoiceRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
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
      .from("invoice_reminder_log")
      .select("invoice_schedule_id, reminder_kind, sent_at")
      .in("invoice_schedule_id", chunk);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of (data ?? []) as LogRow[]) {
      const list = bySchedule.get(row.invoice_schedule_id) ?? [];
      list.push(row);
      bySchedule.set(row.invoice_schedule_id, list);
    }
  }

  return bySchedule;
}

function collectPending(
  invoices: InvoiceRow[],
  logsBySchedule: Map<string, LogRow[]>,
  todayKey: string,
): { pending: PendingReminder[]; skippedDeduped: number } {
  const pending: PendingReminder[] = [];
  let skippedDeduped = 0;

  for (const invoice of invoices) {
    const account = asOne(invoice.accounts);
    const project = asOne(invoice.projects);
    if (!account || account.is_demo) continue;
    if (!project || project.archived_at) continue;

    const scheduleRows = invoice.invoice_schedule ?? [];
    if (scheduleRows.length === 0) continue;

    const total = invoiceTotal(
      (invoice.invoice_line_items ?? []).map((row) => Number(row.amount)),
    );
    const collected = invoiceTotal(
      (invoice.invoice_payments ?? []).map((row) => Number(row.amount)),
    );
    const remaining = invoiceRemaining(total, collected);
    if (remaining <= 0) continue;

    const derived = deriveInvoiceSchedule(
      scheduleRows.map((row) => ({
        id: row.id,
        amount: Number(row.amount),
        due_on: row.due_on,
        label: row.label,
        created_at: row.created_at,
      })),
      collected,
      remaining,
    );

    for (const installment of derived.schedule) {
      if (installment.covered) continue;

      const logs = logsBySchedule.get(installment.id) ?? [];
      const kind = classifyUncovered({
        dueOn: installment.due_on,
        logs,
        todayKey,
      });
      if (!kind) {
        const daysUntil = calendarDaysUntil(installment.due_on, todayKey);
        const onCadence =
          daysUntil === DUE_7_DAYS ||
          daysUntil === DUE_TODAY ||
          daysUntil < 0;
        if (onCadence) skippedDeduped += 1;
        continue;
      }

      const email = invoice.client_email?.trim() || null;
      pending.push({
        scheduleId: installment.id,
        invoiceId: invoice.id,
        projectId: invoice.project_id,
        projectName: project.name,
        accountId: invoice.account_id,
        clientName: invoice.client_name?.trim() || "Invoice",
        clientEmail: email,
        publicUrl: invoicePublicUrl(invoice.access_token),
        amount: installment.amount,
        remaining: installment.remaining,
        dueOn: installment.due_on,
        label: installment.label,
        kind,
        daysUntil: calendarDaysUntil(installment.due_on, todayKey),
      });
    }
  }

  return { pending, skippedDeduped };
}

function buildClientEmail(item: PendingReminder): {
  subject: string;
  text: string;
  html: string;
} {
  const name = item.clientName === "Invoice" ? "there" : item.clientName;
  const title = installmentTitle(item);
  const amount = formatInvoiceMoney(item.remaining);
  const due = formatDueOn(item.dueOn);
  const when =
    item.kind === "due_7"
      ? `is due in 7 days (${due})`
      : item.kind === "due_0"
        ? `is due today (${due})`
        : `was due ${due} and is still open`;
  const subject =
    item.kind === "due_7" || item.kind === "due_0"
      ? `${title} of ${amount} ${item.kind === "due_0" ? "is due today" : "is due in 7 days"}`
      : `${title} of ${amount} is overdue`;

  const text = [
    `Hi ${name},`,
    "",
    `Your ${title} of ${amount} ${when}.`,
    "",
    `View and pay: ${item.publicUrl}`,
    "",
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(name)},</p>`,
    `<p>Your ${escapeHtml(title)} of ${escapeHtml(amount)} ${escapeHtml(when)}.</p>`,
    `<p><a href="${escapeHtml(item.publicUrl)}">View and pay</a></p>`,
  ].join("");

  return { subject, text, html };
}

function buildPlannerDigest(items: PendingReminder[]): {
  subject: string;
  text: string;
  html: string;
} {
  const sorted = [...items].sort((a, b) => {
    if (a.projectName !== b.projectName) {
      return a.projectName.localeCompare(b.projectName);
    }
    if (a.dueOn !== b.dueOn) return a.dueOn.localeCompare(b.dueOn);
    return a.scheduleId.localeCompare(b.scheduleId);
  });

  const hasOverdue = sorted.some((item) => item.daysUntil < 0);
  const hasUpcoming = sorted.some((item) => item.daysUntil >= 0);
  const subject =
    hasOverdue && hasUpcoming
      ? "Upcoming and overdue invoices"
      : hasOverdue
        ? "Overdue invoices"
        : "Upcoming invoices";

  const groups = new Map<string, PendingReminder[]>();
  for (const item of sorted) {
    const list = groups.get(item.projectId) ?? [];
    list.push(item);
    groups.set(item.projectId, list);
  }

  const textParts: string[] = [
    "These invoice installments need attention:",
    "",
  ];
  const htmlParts: string[] = [
    "<p>These invoice installments need attention:</p>",
  ];

  for (const group of groups.values()) {
    const projectName = group[0]!.projectName;
    textParts.push(projectName);
    htmlParts.push(`<p><strong>${escapeHtml(projectName)}</strong></p><ul>`);
    for (const item of group) {
      const line = `${item.clientName} — ${installmentTitle(item)} — ${formatInvoiceMoney(item.remaining)} — ${formatDueOn(item.dueOn)} (${kindLine(item)})`;
      textParts.push(`- ${line}`);
      htmlParts.push(`<li>${escapeHtml(line)}</li>`);
    }
    textParts.push("");
    htmlParts.push("</ul>");
  }

  textParts.push("Open First Look to record what arrived, or share the invoice link.");
  htmlParts.push(
    "<p>Open First Look to record what arrived, or share the invoice link.</p>",
  );

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
    const invoices = await loadIssuedInvoices(supabase);
    const scheduleIds = invoices.flatMap((row) =>
      (row.invoice_schedule ?? []).map((item) => item.id),
    );
    const logsBySchedule = await loadReminderLogs(supabase, scheduleIds);
    const { pending, skippedDeduped } = collectPending(
      invoices,
      logsBySchedule,
      todayKey,
    );

    const loggedIds = new Set<string>();
    let clientEmailsSent = 0;
    const errors: string[] = [];

    for (const item of pending) {
      if (!item.clientEmail) continue;
      const body = buildClientEmail(item);
      const sent = await sendEmailBestEffort(
        {
          to: item.clientEmail,
          subject: body.subject,
          text: body.text,
          html: body.html,
        },
        "invoiceScheduleWatch.client",
      );
      if (sent) {
        clientEmailsSent += 1;
        loggedIds.add(item.scheduleId);
      }
    }

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
    let emailsSent = 0;

    for (const [accountId, items] of byAccount) {
      const recipients = emailsByAccount.get(accountId) ?? [];
      if (recipients.length === 0) {
        errors.push(`account ${accountId}: no member emails`);
        continue;
      }

      const digest = buildPlannerDigest(items);
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

      for (const item of items) loggedIds.add(item.scheduleId);
      accountsNotified += 1;
      emailsSent += 1;
    }

    const toLog = pending.filter((item) => loggedIds.has(item.scheduleId));
    if (toLog.length > 0) {
      const { error: insertError } = await supabase
        .from("invoice_reminder_log")
        .insert(
          toLog.map((item) => ({
            invoice_schedule_id: item.scheduleId,
            invoice_id: item.invoiceId,
            reminder_kind: item.kind,
          })),
        );

      if (insertError) {
        errors.push(`log insert ${insertError.message}`);
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      today: todayKey,
      accountsNotified,
      remindersSent: toLog.length,
      emailsSent,
      clientEmailsSent,
      skippedDeduped,
      errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cron failed.";
    console.error("invoice-schedule-watch:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
