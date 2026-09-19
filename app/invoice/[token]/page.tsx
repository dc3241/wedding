import Link from "next/link";
import type { Metadata } from "next";
import { AccountBrandMark } from "@/components/branding/account-brand-mark";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { Wordmark } from "@/components/ui/topbar";
import { buttonVariantClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { brandAccentStyle } from "@/lib/branding/accent-style";
import { INVOICE_LINE_KIND_LABEL } from "@/lib/invoices/lines";
import { formatInvoiceMoney, invoiceLocalDateKey } from "@/lib/invoices/money";
import { invoiceEffectiveDueDate } from "@/lib/invoices/schedule";
import { getPublicInvoiceByToken } from "@/lib/invoices/public";
import {
  invoiceStatusLabel,
  invoiceStatusPillVariant,
  isInvoiceOverdue,
} from "@/lib/invoices/status";
import type { PublicInvoice } from "@/lib/invoices/types";

export const metadata: Metadata = {
  title: "Invoice",
  description: "View an invoice.",
};

export const dynamic = "force-dynamic";

function InvoiceShell({
  children,
  branding = null,
}: {
  children: React.ReactNode;
  branding?: PublicInvoice["branding"];
}) {
  const whiteLabeled = Boolean(branding);

  return (
    <div
      className="flex min-h-full flex-col bg-canvas text-ink"
      style={brandAccentStyle(branding)}
    >
      <header className="border-b border-hairline px-6 py-[18px] md:px-8">
        {whiteLabeled && branding ? (
          <AccountBrandMark branding={branding} />
        ) : (
          <Link href="/" className="inline-block no-underline">
            <Wordmark />
          </Link>
        )}
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
      {whiteLabeled ? (
        <p className="pb-8 text-center text-[13px] text-muted">
          <Link href="/" className="text-muted no-underline hover:text-ink">
            Powered by First Look
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function InvalidLink() {
  return (
    <Card className="w-full max-w-md p-8 text-center">
      <Eyebrow className="mb-3 block">Invoice</Eyebrow>
      <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink">
        Link not valid
      </h1>
      <p className="mt-4 text-[15px] font-medium text-muted">
        This invoice link isn&apos;t valid. Ask the planner for a new one.
      </p>
    </Card>
  );
}

function formatDue(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invoice = await getPublicInvoiceByToken(decodeURIComponent(token));

  if (!invoice) {
    return (
      <InvoiceShell>
        <InvalidLink />
      </InvoiceShell>
    );
  }

  const overdue = isInvoiceOverdue(
    invoiceEffectiveDueDate({
      dueDate: invoice.due_date,
      nextDueOn: invoice.nextDue?.due_on,
    }),
    invoice.status,
    new Date(),
    invoice.remaining,
  );
  const remaining = invoice.remaining;
  const collected = invoice.collected;
  const settled =
    invoice.status === "paid" || (remaining <= 0 && collected > 0);
  const unpaid = invoice.status !== "void" && remaining > 0;
  const payUrl = invoice.payment_link_url?.trim() || null;
  const dueLabel = formatDue(
    invoiceEffectiveDueDate({
      dueDate: invoice.due_date,
      nextDueOn: invoice.nextDue?.due_on,
    }),
  );
  const heading = invoice.client_name?.trim() || "Invoice";
  const todayKey = invoiceLocalDateKey();

  return (
    <InvoiceShell branding={invoice.branding}>
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow className="mb-3 block">
              {invoice.invoice_number?.trim() || "Invoice"}
            </Eyebrow>
            <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink">
              {heading}
            </h1>
          </div>
          <Pill variant={invoiceStatusPillVariant(invoice.status, overdue)}>
            {invoiceStatusLabel(invoice.status, overdue)}
          </Pill>
        </div>

        {dueLabel ? (
          <p className="mt-4 text-[15px] font-medium text-muted">
            {invoice.nextDue
              ? `${invoice.nextDue.label?.trim() || "Next"} due ${dueLabel}`
              : `Due ${dueLabel}`}
          </p>
        ) : null}

        <ul className="mt-6 space-y-2">
          {invoice.line_items.map((item, index) => (
            <li
              key={`${item.sort_order}-${index}`}
              className="flex items-start justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-ink">
                  {item.description}
                </p>
                <p className="mt-0.5 text-[13px] tabular-nums text-muted">
                  {item.kind !== "item"
                    ? `${INVOICE_LINE_KIND_LABEL[item.kind]} · `
                    : ""}
                  {item.quantity} × {formatInvoiceMoney(item.unit_price)}
                </p>
              </div>
              <span className="shrink-0 tabular-nums text-[15px] font-medium text-ink">
                {formatInvoiceMoney(item.amount)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-right text-[19px] font-extrabold tabular-nums tracking-[-0.02em] text-ink">
          Total {formatInvoiceMoney(invoice.total)}
        </p>
        {collected > 0 && remaining > 0 ? (
          <p className="mt-1 text-right text-[15px] font-medium tabular-nums text-muted">
            {formatInvoiceMoney(collected)} paid · {formatInvoiceMoney(remaining)} due
          </p>
        ) : remaining > 0 ? (
          <p className="mt-1 text-right text-[15px] font-medium tabular-nums text-muted">
            {formatInvoiceMoney(remaining)} due
          </p>
        ) : null}

        {invoice.schedule.length > 0 ? (
          <ul className="mt-6 space-y-2">
            {invoice.schedule.map((row, index) => {
              const pastDue = !row.covered && row.due_on < todayKey;
              return (
                <li
                  key={`${row.due_on}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-ink">
                      {row.label?.trim() || "Installment"}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-[13px]",
                        pastDue ? "text-rosewood" : "text-muted",
                      )}
                    >
                      {formatDue(row.due_on)}
                      {row.covered
                        ? " · paid"
                        : pastDue
                          ? " · past due"
                          : row.remaining < row.amount
                            ? ` · ${formatInvoiceMoney(row.remaining)} due`
                            : ""}
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums text-[15px] font-medium text-ink">
                    {formatInvoiceMoney(row.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {invoice.notes?.trim() ? (
          <p className="mt-4 text-[15px] font-medium text-muted">{invoice.notes}</p>
        ) : null}

        {invoice.terms?.trim() ? (
          <div className="mt-6 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
            <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
              Terms
            </p>
            <p className="mt-2 whitespace-pre-wrap text-[13px] text-muted">
              {invoice.terms}
            </p>
          </div>
        ) : null}

        {invoice.status === "void" ? (
          <p className="mt-6 rounded-[var(--radius-inner)] bg-well px-4 py-3 text-center text-[15px] font-medium text-muted shadow-recessed">
            This invoice is no longer active.
          </p>
        ) : settled ? (
          <p className="mt-6 rounded-[var(--radius-inner)] bg-well px-4 py-3 text-center text-[15px] font-medium text-sage shadow-recessed">
            This invoice is paid. Thank you.
          </p>
        ) : payUrl && unpaid ? (
          <a
            href={payUrl}
            target="_blank"
            rel="noopener"
            className={cn(
              "mt-6 inline-flex w-full cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] px-5 py-2.5 text-[14px] font-semibold no-underline",
              buttonVariantClasses.primary,
            )}
          >
            Pay now
          </a>
        ) : null}
      </Card>
    </InvoiceShell>
  );
}
