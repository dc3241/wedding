import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { formatInvoiceMoney } from "@/lib/invoices/money";
import {
  invoiceStatusLabel,
  invoiceStatusPillVariant,
  isInvoiceOverdue,
} from "@/lib/invoices/status";
import type { InvoiceRow } from "@/lib/invoices/types";

function formatDue(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvoiceList({
  projectId,
  invoices,
}: {
  projectId: string;
  invoices: InvoiceRow[];
}) {
  if (invoices.length === 0) {
    return (
      <EmptyState>
        No invoices yet. Create one above — you can send a public link when it&apos;s
        ready.
      </EmptyState>
    );
  }

  return (
    <Card className="space-y-2 p-2">
      {invoices.map((invoice) => {
        const overdue = isInvoiceOverdue(invoice.due_date, invoice.status);
        const title = invoice.client_name?.trim() || "Untitled invoice";
        return (
          <Link
            key={invoice.id}
            href={`/projects/${projectId}/invoices/${invoice.id}`}
            className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-inner)] bg-well px-4 py-3 no-underline shadow-recessed sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-ink">{title}</p>
              <p className="mt-1 text-[13px] text-muted">
                Due {formatDue(invoice.due_date)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[15px] font-medium tabular-nums text-ink">
                {formatInvoiceMoney(invoice.total)}
              </span>
              <Pill variant={invoiceStatusPillVariant(invoice.status, overdue)}>
                {invoiceStatusLabel(invoice.status, overdue)}
              </Pill>
            </div>
          </Link>
        );
      })}
    </Card>
  );
}
