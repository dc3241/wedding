import type { InvoiceLineKind } from "@/lib/invoices/types";
import { parseMoney, roundInvoiceMoney } from "@/lib/invoices/money";

export type { InvoiceLineKind };

export const INVOICE_LINE_KINDS = ["item", "tax", "discount"] as const;

export const INVOICE_LINE_KIND_LABEL: Record<InvoiceLineKind, string> = {
  item: "Item",
  tax: "Tax",
  discount: "Discount",
};

export function asInvoiceLineKind(value: unknown): InvoiceLineKind | null {
  if (typeof value !== "string") return null;
  return (INVOICE_LINE_KINDS as readonly string[]).includes(value)
    ? (value as InvoiceLineKind)
    : null;
}

export function invoiceLineAmount(
  kind: InvoiceLineKind,
  quantity: number,
  unitPrice: number,
): number {
  const raw = roundInvoiceMoney(Math.max(0, quantity) * Math.max(0, unitPrice));
  return kind === "discount" ? roundInvoiceMoney(-raw) : raw;
}

export function parseInvoiceQuantity(value: unknown): number {
  const quantity = parseMoney(value);
  return quantity > 0 ? quantity : 0;
}
