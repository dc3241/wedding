import { invoiceEffectiveDueDate } from "@/lib/invoices/schedule";
import { isInvoiceOverdue } from "@/lib/invoices/status";
import type { AccountInvoiceRow } from "@/lib/invoices/types";

export const INVOICE_INBOX_FILTERS = [
  "all",
  "overdue",
  "unpaid",
  "draft",
  "paid",
  "void",
] as const;

export type InvoiceInboxFilter = (typeof INVOICE_INBOX_FILTERS)[number];

export const INVOICE_INBOX_FILTER_LABEL: Record<InvoiceInboxFilter, string> = {
  all: "All",
  overdue: "Overdue",
  unpaid: "Unpaid",
  draft: "Draft",
  paid: "Paid",
  void: "Void",
};

export function invoiceInboxDueDate(invoice: AccountInvoiceRow): string | null {
  return invoiceEffectiveDueDate({
    dueDate: invoice.due_date,
    nextDueOn: invoice.nextDue?.due_on,
  });
}

export function invoiceInboxOverdue(
  invoice: AccountInvoiceRow,
  now: Date = new Date(),
): boolean {
  return isInvoiceOverdue(
    invoiceInboxDueDate(invoice),
    invoice.status,
    now,
    invoice.remaining,
  );
}

export function invoiceInboxUnpaid(invoice: AccountInvoiceRow): boolean {
  return (
    invoice.remaining > 0 &&
    invoice.status !== "void" &&
    invoice.status !== "draft"
  );
}

export function matchesInvoiceInboxFilter(
  invoice: AccountInvoiceRow,
  filter: InvoiceInboxFilter,
  now: Date = new Date(),
): boolean {
  if (filter === "all") return true;
  if (filter === "draft") return invoice.status === "draft";
  if (filter === "paid") return invoice.status === "paid";
  if (filter === "void") return invoice.status === "void";
  if (filter === "unpaid") return invoiceInboxUnpaid(invoice);
  return invoiceInboxUnpaid(invoice) && invoiceInboxOverdue(invoice, now);
}

export function sortInvoiceInbox(
  invoices: AccountInvoiceRow[],
  now: Date = new Date(),
): AccountInvoiceRow[] {
  return [...invoices].sort((a, b) => {
    const aOverdue = invoiceInboxOverdue(a, now);
    const bOverdue = invoiceInboxOverdue(b, now);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    const aDue = invoiceInboxDueDate(a) ?? "9999-99-99";
    const bDue = invoiceInboxDueDate(b) ?? "9999-99-99";
    if (aDue !== bDue) return aDue.localeCompare(bDue);
    if (b.remaining !== a.remaining) return b.remaining - a.remaining;
    return b.created_at.localeCompare(a.created_at);
  });
}
