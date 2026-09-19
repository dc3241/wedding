import {
  INVOICE_PAYMENT_METHODS,
  type InvoicePaymentMethod,
} from "@/lib/invoices/types";

export const INVOICE_PAYMENT_METHOD_LABEL: Record<InvoicePaymentMethod, string> =
  {
    venmo: "Venmo",
    zelle: "Zelle",
    check: "Check",
    cash: "Cash",
    stripe_link: "Stripe",
    other: "Other",
  };

export function asPaymentMethod(value: unknown): InvoicePaymentMethod | null {
  if (typeof value !== "string") return null;
  return (INVOICE_PAYMENT_METHODS as readonly string[]).includes(value)
    ? (value as InvoicePaymentMethod)
    : null;
}
