"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import type { AccountPlan } from "@/lib/account-context";
import {
  INVOICE_INBOX_FILTERS,
  INVOICE_INBOX_FILTER_LABEL,
  invoiceInboxDueDate,
  invoiceInboxOverdue,
  matchesInvoiceInboxFilter,
  sortInvoiceInbox,
  type InvoiceInboxFilter,
} from "@/lib/invoices/inbox";
import { formatInvoiceMoney } from "@/lib/invoices/money";
import {
  invoiceStatusLabel,
  invoiceStatusPillVariant,
} from "@/lib/invoices/status";
import type { AccountInvoiceRow } from "@/lib/invoices/types";
import { getCopy } from "@/lib/venue-copy";

function formatDue(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AccountInvoiceBoard({
  invoices,
  plan,
}: {
  invoices: AccountInvoiceRow[];
  plan: AccountPlan;
}) {
  const [filter, setFilter] = useState<InvoiceInboxFilter>("all");
  const [projectId, setProjectId] = useState("");
  const now = useMemo(() => new Date(), []);

  const weddings = useMemo(() => {
    const byId = new Map<string, { name: string; archived: boolean }>();
    for (const invoice of invoices) {
      if (byId.has(invoice.project_id)) continue;
      byId.set(invoice.project_id, {
        name: invoice.project_name,
        archived: Boolean(invoice.archived_at),
      });
    }
    return [...byId.entries()]
      .map(([id, row]) => ({ id, ...row }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  const visible = useMemo(() => {
    const filtered = invoices.filter((invoice) => {
      if (projectId && invoice.project_id !== projectId) return false;
      return matchesInvoiceInboxFilter(invoice, filter, now);
    });
    return sortInvoiceInbox(filtered, now);
  }, [invoices, filter, projectId, now]);

  if (invoices.length === 0) {
    return (
      <EmptyState>
        {getCopy("invoicesEmpty", plan)}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Filter invoices"
          className="flex flex-wrap gap-1 rounded-[var(--radius-pill)] bg-well p-1 shadow-recessed"
        >
          {INVOICE_INBOX_FILTERS.map((option) => {
            const active = filter === option;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(option)}
                className={cn(
                  "cursor-pointer rounded-[var(--radius-pill)] border-none px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-accent-wash text-accent"
                    : "bg-transparent text-muted hover:text-ink",
                )}
              >
                {INVOICE_INBOX_FILTER_LABEL[option]}
              </button>
            );
          })}
        </div>
        {weddings.length > 1 ? (
          <div className="flex min-w-0 items-center gap-2 sm:w-auto sm:max-w-xs">
            <label
              htmlFor="invoice-inbox-wedding"
              className="shrink-0 text-[13px] font-medium text-muted"
            >
              {getCopy("invoicesWeddingFilter", plan)}
            </label>
            <Select
              id="invoice-inbox-wedding"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="min-w-0 py-1.5 text-[13px]"
            >
              <option value="">All</option>
              {weddings.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                  {row.archived ? " (archived)" : ""}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
      </div>

      <p className="text-[13px] text-muted">
        {visible.length === invoices.length
          ? `${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"}`
          : `${visible.length} of ${invoices.length}`}
      </p>

      {visible.length === 0 ? (
        <EmptyState recessed>
          No invoices match this filter.
        </EmptyState>
      ) : (
        <Card className="space-y-2 p-2">
          {visible.map((invoice) => {
            const dueDate = invoiceInboxDueDate(invoice);
            const overdue = invoiceInboxOverdue(invoice, now);
            const title = invoice.client_name?.trim() || "Untitled invoice";
            return (
              <Link
                key={invoice.id}
                href={`/projects/${invoice.project_id}/invoices/${invoice.id}`}
                className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-inner)] bg-well px-4 py-3 no-underline shadow-recessed sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink">{title}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {invoice.project_name}
                    {invoice.archived_at ? " · Archived" : ""}
                    {invoice.invoice_number ? ` · ${invoice.invoice_number}` : ""}
                    {` · Due ${formatDue(dueDate)}`}
                    {invoice.nextDue?.label?.trim()
                      ? ` · ${invoice.nextDue.label}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="text-[15px] font-medium tabular-nums text-ink">
                      {formatInvoiceMoney(invoice.total)}
                    </p>
                    {invoice.remaining > 0 && invoice.status !== "draft" ? (
                      <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                        {formatInvoiceMoney(invoice.remaining)} due
                      </p>
                    ) : null}
                  </div>
                  <Pill variant={invoiceStatusPillVariant(invoice.status, overdue)}>
                    {invoiceStatusLabel(invoice.status, overdue)}
                  </Pill>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
