import type { PillVariant } from "@/components/ui/pill";
import type { InvoiceStatus } from "@/lib/invoices/types";

/** Due date is past and the invoice is still outstanding (sent, not paid). */
export function isInvoiceOverdue(
  dueDate: string | null | undefined,
  status: string,
  now: Date = new Date(),
): boolean {
  if (!dueDate || status !== "sent") return false;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  return due < today;
}

export function invoiceStatusLabel(
  status: InvoiceStatus,
  overdue: boolean,
): string {
  if (overdue) return "Overdue";
  if (status === "draft") return "Draft";
  if (status === "sent") return "Sent";
  if (status === "paid") return "Paid";
  return "Void";
}

export function invoiceStatusPillVariant(
  status: InvoiceStatus,
  overdue: boolean,
): PillVariant {
  if (status === "paid") return "sage";
  if (status === "void" || overdue) return "rosewood";
  if (status === "sent") return "clay";
  return "default";
}
