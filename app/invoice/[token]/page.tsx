import Link from "next/link";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { Wordmark } from "@/components/ui/topbar";
import { buttonVariantClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatInvoiceMoney } from "@/lib/invoices/money";
import { getPublicInvoiceByToken } from "@/lib/invoices/public";
import {
  invoiceStatusLabel,
  invoiceStatusPillVariant,
  isInvoiceOverdue,
} from "@/lib/invoices/status";

export const metadata: Metadata = {
  title: "Invoice",
  description: "View an invoice.",
};

export const dynamic = "force-dynamic";

function InvoiceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="border-b border-hairline px-6 py-[18px] md:px-8">
        <Link href="/" className="inline-block no-underline">
          <Wordmark />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
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

  const overdue = isInvoiceOverdue(invoice.due_date, invoice.status);
  const unpaid = invoice.status !== "paid" && invoice.status !== "void";
  const payUrl = invoice.payment_link_url?.trim() || null;
  const dueLabel = formatDue(invoice.due_date);
  const heading = invoice.client_name?.trim() || "Invoice";

  return (
    <InvoiceShell>
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Eyebrow className="mb-3 block">Invoice</Eyebrow>
            <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.03em] text-ink">
              {heading}
            </h1>
          </div>
          <Pill variant={invoiceStatusPillVariant(invoice.status, overdue)}>
            {invoiceStatusLabel(invoice.status, overdue)}
          </Pill>
        </div>

        {dueLabel ? (
          <p className="mt-4 text-[15px] font-medium text-muted">Due {dueLabel}</p>
        ) : null}

        <ul className="mt-6 space-y-2">
          {invoice.line_items.map((item, index) => (
            <li
              key={`${item.sort_order}-${index}`}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
            >
              <span className="min-w-0 text-[15px] font-medium text-ink">
                {item.description}
              </span>
              <span className="shrink-0 tabular-nums text-[15px] font-medium text-ink">
                {formatInvoiceMoney(item.amount)}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-right text-[19px] font-extrabold tabular-nums tracking-[-0.02em] text-ink">
          Total {formatInvoiceMoney(invoice.total)}
        </p>

        {invoice.notes?.trim() ? (
          <p className="mt-4 text-[15px] font-medium text-muted">{invoice.notes}</p>
        ) : null}

        {invoice.status === "paid" ? (
          <p className="mt-6 rounded-[var(--radius-inner)] bg-well px-4 py-3 text-center text-[15px] font-medium text-sage shadow-recessed">
            This invoice is paid. Thank you.
          </p>
        ) : invoice.status === "void" ? (
          <p className="mt-6 rounded-[var(--radius-inner)] bg-well px-4 py-3 text-center text-[15px] font-medium text-muted shadow-recessed">
            This invoice is no longer active.
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
