import { isInvoiceIssued } from "@/lib/invoices/coverage";
import { invoiceLocalDateKey, roundInvoiceMoney } from "@/lib/invoices/money";
import {
  invoiceEffectiveDueDate,
  overdueScheduleAmount,
} from "@/lib/invoices/schedule";
import { isInvoiceOverdue } from "@/lib/invoices/status";
import type {
  AccountInvoiceRow,
  InvoicePaymentMethod,
} from "@/lib/invoices/types";

export type MoneyMethodShare = {
  method: InvoicePaymentMethod;
  amount: number;
};

export type MoneyWeddingRow = {
  projectId: string;
  projectName: string;
  weddingDate: string | null;
  billed: number;
  collected: number;
  remaining: number;
};

export type MoneyOutstandingRow = {
  invoiceId: string;
  projectId: string;
  projectName: string;
  clientName: string;
  invoiceNumber: string;
  remaining: number;
  dueDate: string | null;
  overdue: boolean;
};

export type MoneySummary = {
  collectedMonth: number;
  collectedYear: number;
  outstanding: number;
  overdue: number;
  billedIssued: number;
  collectedIssued: number;
  methodMixYear: MoneyMethodShare[];
  weddings: MoneyWeddingRow[];
  outstandingInvoices: MoneyOutstandingRow[];
};

function inLocalMonth(paidOn: string, nowKey: string): boolean {
  return paidOn.slice(0, 7) === nowKey.slice(0, 7);
}

function inLocalYear(paidOn: string, nowKey: string): boolean {
  return paidOn.slice(0, 4) === nowKey.slice(0, 4);
}

export function buildMoneySummary(
  invoices: AccountInvoiceRow[],
  now: Date = new Date(),
): MoneySummary {
  const nowKey = invoiceLocalDateKey(now);
  let collectedMonth = 0;
  let collectedYear = 0;
  let outstanding = 0;
  let overdue = 0;
  let billedIssued = 0;
  let collectedIssued = 0;
  const methodYear = new Map<InvoicePaymentMethod, number>();
  const byProject = new Map<string, MoneyWeddingRow>();
  const outstandingInvoices: MoneyOutstandingRow[] = [];

  for (const invoice of invoices) {
    const total = roundInvoiceMoney(invoice.total);
    const collected = roundInvoiceMoney(invoice.collected);
    const remaining = roundInvoiceMoney(invoice.remaining);
    const issued = isInvoiceIssued(invoice.status);
    const voided = invoice.status === "void";

    if (!voided) {
      for (const payment of invoice.payments) {
        if (inLocalMonth(payment.paid_on, nowKey)) {
          collectedMonth += payment.amount;
        }
        if (inLocalYear(payment.paid_on, nowKey)) {
          collectedYear += payment.amount;
          methodYear.set(
            payment.method,
            (methodYear.get(payment.method) ?? 0) + payment.amount,
          );
        }
      }
    }

    if (issued) {
      billedIssued += total;
      collectedIssued += collected;
      outstanding += remaining;
      const dueDate = invoiceEffectiveDueDate({
        dueDate: invoice.due_date,
        nextDueOn: invoice.nextDue?.due_on,
      });
      const overdueInvoice = isInvoiceOverdue(
        dueDate,
        invoice.status,
        now,
        remaining,
      );
      const scheduleOverdue = overdueScheduleAmount(invoice.schedule, nowKey);
      if (scheduleOverdue > 0) overdue += scheduleOverdue;
      else if (overdueInvoice) overdue += remaining;

      if (remaining > 0) {
        outstandingInvoices.push({
          invoiceId: invoice.id,
          projectId: invoice.project_id,
          projectName: invoice.project_name,
          clientName: invoice.client_name?.trim() || "Untitled invoice",
          invoiceNumber: invoice.invoice_number,
          remaining,
          dueDate,
          overdue: overdueInvoice,
        });
      }
    }

    if (voided) continue;

    const existing = byProject.get(invoice.project_id) ?? {
      projectId: invoice.project_id,
      projectName: invoice.project_name,
      weddingDate: invoice.wedding_date,
      billed: 0,
      collected: 0,
      remaining: 0,
    };
    if (issued) {
      existing.billed += total;
      existing.remaining += remaining;
    }
    existing.collected += collected;
    byProject.set(invoice.project_id, existing);
  }

  const weddings = [...byProject.values()].sort((a, b) => {
    if (b.remaining !== a.remaining) return b.remaining - a.remaining;
    return a.projectName.localeCompare(b.projectName);
  });

  outstandingInvoices.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    const aDue = a.dueDate ?? "9999-99-99";
    const bDue = b.dueDate ?? "9999-99-99";
    if (aDue !== bDue) return aDue.localeCompare(bDue);
    return b.remaining - a.remaining;
  });

  const methodMixYear: MoneyMethodShare[] = [...methodYear.entries()]
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    collectedMonth: roundInvoiceMoney(collectedMonth),
    collectedYear: roundInvoiceMoney(collectedYear),
    outstanding: roundInvoiceMoney(outstanding),
    overdue: roundInvoiceMoney(overdue),
    billedIssued: roundInvoiceMoney(billedIssued),
    collectedIssued: roundInvoiceMoney(collectedIssued),
    methodMixYear,
    weddings,
    outstandingInvoices,
  };
}
