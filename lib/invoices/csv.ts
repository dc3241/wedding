import {
  invoiceInboxDueDate,
  invoiceInboxOverdue,
} from "@/lib/invoices/inbox";
import { INVOICE_PAYMENT_METHOD_LABEL } from "@/lib/invoices/methods";
import { invoiceLocalDateKey, roundInvoiceMoney } from "@/lib/invoices/money";
import { invoiceStatusLabel } from "@/lib/invoices/status";
import type { AccountInvoiceRow } from "@/lib/invoices/types";

export const INVOICE_CSV_KINDS = ["invoices", "collections"] as const;
export type InvoiceCsvKind = (typeof INVOICE_CSV_KINDS)[number];

export type InvoiceCsvLabels = {
  projectColumn: string;
  projectDateColumn: string;
};

export function isInvoiceCsvKind(value: string | null): value is InvoiceCsvKind {
  return value === "invoices" || value === "collections";
}

export function invoiceCsvFilename(
  kind: InvoiceCsvKind,
  now: Date = new Date(),
): string {
  const day = invoiceLocalDateKey(now);
  return kind === "invoices"
    ? `first-look-invoices-${day}.csv`
    : `first-look-collections-${day}.csv`;
}

export function buildInvoiceCsv(
  invoices: AccountInvoiceRow[],
  labels: InvoiceCsvLabels,
  now: Date = new Date(),
): string {
  const headers = [
    labels.projectColumn,
    labels.projectDateColumn,
    "Invoice number",
    "Client",
    "Email",
    "Status",
    "Overdue",
    "Issue date",
    "Due date",
    "Billed",
    "Collected",
    "Outstanding",
    "Methods",
    "Last collected on",
    "Archived",
  ];
  const rows = [...invoices]
    .sort(compareInvoicesForCsv)
    .map((invoice) => {
      const dueDate = invoiceInboxDueDate(invoice);
      const overdue = invoiceInboxOverdue(invoice, now);
      return [
        invoice.project_name,
        invoice.wedding_date ?? "",
        invoice.invoice_number,
        invoice.client_name?.trim() ?? "",
        invoice.client_email?.trim() ?? "",
        invoiceStatusLabel(invoice.status, false),
        overdue ? "Yes" : "",
        invoice.issue_date,
        dueDate ?? "",
        csvMoney(invoice.total),
        csvMoney(invoice.collected),
        csvMoney(invoice.remaining),
        invoiceMethodLabels(invoice),
        lastCollectedOn(invoice),
        invoice.archived_at ? "Yes" : "",
      ];
    });
  return toCsv(headers, rows);
}

export function buildCollectionCsv(
  invoices: AccountInvoiceRow[],
  labels: InvoiceCsvLabels,
): string {
  const headers = [
    "Collected on",
    "Amount",
    "Method",
    "Note",
    "Reference",
    "Invoice number",
    "Client",
    labels.projectColumn,
    "Invoice status",
    "Billed",
    "Outstanding",
  ];
  const rows = invoices
    .filter((invoice) => invoice.status !== "void")
    .flatMap((invoice) =>
      [...invoice.payments]
        .sort(comparePaymentsForCsv)
        .map((payment) => [
          payment.paid_on,
          csvMoney(payment.amount),
          INVOICE_PAYMENT_METHOD_LABEL[payment.method],
          payment.note?.trim() ?? "",
          payment.external_ref?.trim() ?? "",
          invoice.invoice_number,
          invoice.client_name?.trim() ?? "",
          invoice.project_name,
          invoiceStatusLabel(invoice.status, false),
          csvMoney(invoice.total),
          csvMoney(invoice.remaining),
        ]),
    )
    .sort((a, b) => {
      if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
      if (a[5] !== b[5]) return a[5].localeCompare(b[5]);
      return a[1].localeCompare(b[1]);
    });
  return toCsv(headers, rows);
}

function compareInvoicesForCsv(a: AccountInvoiceRow, b: AccountInvoiceRow) {
  if (a.issue_date !== b.issue_date) {
    return a.issue_date.localeCompare(b.issue_date);
  }
  if (a.invoice_number !== b.invoice_number) {
    return a.invoice_number.localeCompare(b.invoice_number);
  }
  return b.created_at.localeCompare(a.created_at);
}

function comparePaymentsForCsv(
  a: AccountInvoiceRow["payments"][number],
  b: AccountInvoiceRow["payments"][number],
) {
  if (a.paid_on !== b.paid_on) return a.paid_on.localeCompare(b.paid_on);
  if (a.created_at !== b.created_at) {
    return a.created_at.localeCompare(b.created_at);
  }
  return a.id.localeCompare(b.id);
}

function invoiceMethodLabels(invoice: AccountInvoiceRow): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const payment of [...invoice.payments].sort(comparePaymentsForCsv)) {
    if (seen.has(payment.method)) continue;
    seen.add(payment.method);
    labels.push(INVOICE_PAYMENT_METHOD_LABEL[payment.method]);
  }
  return labels.join("; ");
}

function lastCollectedOn(invoice: AccountInvoiceRow): string {
  let latest = "";
  for (const payment of invoice.payments) {
    if (payment.paid_on > latest) latest = payment.paid_on;
  }
  return latest;
}

function csvMoney(amount: number): string {
  return roundInvoiceMoney(amount).toFixed(2);
}

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCsvField).join(","),
  );
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
