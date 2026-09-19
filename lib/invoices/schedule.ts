import {
  invoiceLocalDateKey,
  roundInvoiceMoney,
} from "@/lib/invoices/money";
import type {
  InvoiceNextDue,
  InvoiceScheduleInstallment,
  InvoiceScheduleRow,
} from "@/lib/invoices/types";

/**
 * Allocate collected payments across installments in due-date order.
 * Remaining on an uncovered row is the still-unpaid slice of that installment
 * — not the whole invoice balance.
 */
export function deriveInvoiceSchedule(
  rows: InvoiceScheduleRow[],
  collected: number,
  invoiceRemaining: number,
): {
  schedule: InvoiceScheduleInstallment[];
  nextDue: InvoiceNextDue | null;
} {
  const sorted = [...rows].sort((a, b) => {
    if (a.due_on !== b.due_on) return a.due_on.localeCompare(b.due_on);
    if (a.created_at !== b.created_at) {
      return a.created_at.localeCompare(b.created_at);
    }
    return a.id.localeCompare(b.id);
  });

  const invoicePaid = invoiceRemaining <= 0;
  let pool = roundInvoiceMoney(Math.max(0, collected));
  let nextDue: InvoiceNextDue | null = null;

  const schedule = sorted.map((row) => {
    if (invoicePaid) {
      return { ...row, covered: true, remaining: 0 };
    }
    const coveredAmount = roundInvoiceMoney(Math.min(row.amount, pool));
    pool = roundInvoiceMoney(Math.max(0, pool - coveredAmount));
    const remaining = roundInvoiceMoney(row.amount - coveredAmount);
    const covered = remaining <= 0;
    if (!covered && nextDue === null) {
      nextDue = {
        id: row.id,
        label: row.label,
        due_on: row.due_on,
        remaining,
      };
    }
    return { ...row, covered, remaining };
  });

  return { schedule, nextDue };
}

export function invoiceEffectiveDueDate(args: {
  dueDate: string | null;
  nextDueOn: string | null | undefined;
}): string | null {
  return args.nextDueOn || args.dueDate || null;
}

export function overdueScheduleAmount(
  schedule: InvoiceScheduleInstallment[],
  todayKey: string = invoiceLocalDateKey(),
): number {
  return roundInvoiceMoney(
    schedule
      .filter((row) => !row.covered && row.due_on < todayKey)
      .reduce((sum, row) => sum + row.remaining, 0),
  );
}
