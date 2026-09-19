"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";
import { INVOICE_PAYMENT_METHOD_LABEL } from "@/lib/invoices/methods";
import { formatInvoiceMoney } from "@/lib/invoices/money";
import type { MoneySummary } from "@/lib/invoices/summary";
import type { AccountPlan } from "@/lib/account-context";
import { getCopy } from "@/lib/venue-copy";

function formatDue(iso: string | null) {
  if (!iso) return "No due date";
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function MoneyBoard({
  summary,
  plan,
}: {
  summary: MoneySummary;
  plan: AccountPlan;
}) {
  const billed = summary.billedIssued;
  const collectedPct =
    billed > 0 ? Math.min(100, Math.round((summary.collectedIssued / billed) * 100)) : 0;
  const hasActivity =
    summary.weddings.length > 0 ||
    summary.outstandingInvoices.length > 0 ||
    summary.collectedYear > 0;

  if (!hasActivity) {
    return (
      <EmptyState>
        No invoices yet. Create one on a wedding, then record what you collected.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          value={formatInvoiceMoney(summary.collectedMonth)}
          label="Collected this month"
          className="[&>div:first-child]:text-[32px] md:[&>div:first-child]:text-[40px]"
        />
        <StatCard
          value={formatInvoiceMoney(summary.collectedYear)}
          label="Collected this year"
          className="[&>div:first-child]:text-[32px] md:[&>div:first-child]:text-[40px]"
        />
        <StatCard
          value={formatInvoiceMoney(summary.outstanding)}
          label="Outstanding"
          className="[&>div:first-child]:text-[32px] md:[&>div:first-child]:text-[40px]"
        />
        <StatCard
          value={formatInvoiceMoney(summary.overdue)}
          label="Overdue"
          className="[&>div:first-child]:text-[32px] md:[&>div:first-child]:text-[40px]"
        />
      </div>

      {billed > 0 ? (
        <Card className="p-6">
          <p className="text-[14px] font-medium text-muted">
            Collected of billed
          </p>
          <p className="mt-1 text-[15px] font-medium tabular-nums text-ink">
            {formatInvoiceMoney(summary.collectedIssued)} of{" "}
            {formatInvoiceMoney(billed)}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-[var(--radius-pill)] bg-well shadow-recessed">
            <div
              className="h-full rounded-[var(--radius-pill)] bg-sage"
              style={{ width: `${collectedPct}%` }}
            />
          </div>
        </Card>
      ) : null}

      {summary.methodMixYear.length > 0 ? (
        <section>
          <SectionHeader>How you collected this year</SectionHeader>
          <Card className="space-y-2 p-2">
            {summary.methodMixYear.map((row) => (
              <div
                key={row.method}
                className="flex items-center justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
              >
                <p className="text-[15px] font-medium text-ink">
                  {INVOICE_PAYMENT_METHOD_LABEL[row.method]}
                </p>
                <p className="text-[15px] font-medium tabular-nums text-ink">
                  {formatInvoiceMoney(row.amount)}
                </p>
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      {summary.outstandingInvoices.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center gap-3.5">
            <Eyebrow className="mb-0 shrink-0">Open invoices</Eyebrow>
            <div className="h-px flex-1 bg-hairline" aria-hidden />
            <Link
              href="/invoices"
              className="shrink-0 text-[13px] font-semibold text-accent no-underline hover:underline"
            >
              All invoices
            </Link>
          </div>
          <Card className="space-y-2 p-2">
            {summary.outstandingInvoices.map((row) => (
              <Link
                key={row.invoiceId}
                href={`/projects/${row.projectId}/invoices/${row.invoiceId}`}
                className="flex min-w-0 flex-col gap-2 rounded-[var(--radius-inner)] bg-well px-4 py-3 no-underline shadow-recessed sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink">
                    {row.clientName}
                  </p>
                  <p className="mt-1 text-[13px] text-muted">
                    {row.projectName}
                    {row.invoiceNumber ? ` · ${row.invoiceNumber}` : ""} · Due{" "}
                    {formatDue(row.dueDate)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[15px] font-medium tabular-nums text-ink">
                    {formatInvoiceMoney(row.remaining)}
                  </span>
                  {row.overdue ? (
                    <Pill variant="rosewood">Overdue</Pill>
                  ) : (
                    <Pill variant="clay">Due</Pill>
                  )}
                </div>
              </Link>
            ))}
          </Card>
        </section>
      ) : null}

      {summary.weddings.length > 0 ? (
        <section>
          <SectionHeader>{getCopy("moneyByWedding", plan)}</SectionHeader>
          <Card className="overflow-hidden p-0">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-3 border-b border-hairline px-5 py-3 text-[13px] font-medium text-muted sm:grid">
              <span>{getCopy("moneyWeddingColumn", plan)}</span>
              <span className="text-right">Billed</span>
              <span className="text-right">Collected</span>
              <span className="text-right">Balance</span>
            </div>
            <ul>
              {summary.weddings.map((row) => (
                <li
                  key={row.projectId}
                  className="border-b border-hairline last:border-b-0"
                >
                  <Link
                    href={`/projects/${row.projectId}/invoices`}
                    className="grid grid-cols-1 gap-2 px-5 py-4 no-underline sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] sm:items-center sm:gap-3"
                  >
                    <p className="min-w-0 truncate text-[15px] font-medium text-ink">
                      {row.projectName}
                    </p>
                    <p className="flex justify-between text-[15px] font-medium tabular-nums text-ink sm:block sm:text-right">
                      <span className="sm:hidden text-[13px] text-muted">
                        Billed
                      </span>
                      {formatInvoiceMoney(row.billed)}
                    </p>
                    <p className="flex justify-between text-[15px] font-medium tabular-nums text-ink sm:block sm:text-right">
                      <span className="sm:hidden text-[13px] text-muted">
                        Collected
                      </span>
                      {formatInvoiceMoney(row.collected)}
                    </p>
                    <p className="flex justify-between text-[15px] font-medium tabular-nums text-ink sm:block sm:text-right">
                      <span className="sm:hidden text-[13px] text-muted">
                        Balance
                      </span>
                      {formatInvoiceMoney(row.remaining)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
