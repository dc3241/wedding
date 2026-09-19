import { roundInvoiceMoney } from "@/lib/invoices/money";
import type { InvoiceStatus } from "@/lib/invoices/types";

/** Paid / partial come from the ledger. Void stays sticky. */
export function deriveInvoiceStatus(args: {
  status: InvoiceStatus;
  collected: number;
  total: number;
  sentAt: string | null;
}): InvoiceStatus {
  if (args.status === "void") return "void";

  const collected = roundInvoiceMoney(args.collected);
  const total = roundInvoiceMoney(args.total);

  if (total <= 0) {
    if (args.status === "paid") return "paid";
    return args.sentAt ? "sent" : "draft";
  }

  if (collected >= total) return "paid";
  if (collected > 0) return "partial";
  if (args.sentAt) return "sent";
  return "draft";
}

export function isInvoiceIssued(status: InvoiceStatus): boolean {
  return status === "sent" || status === "partial" || status === "paid";
}
