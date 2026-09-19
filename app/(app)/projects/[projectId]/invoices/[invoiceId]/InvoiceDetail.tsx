"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  emptyDraftLine,
  InvoiceLineEditor,
  toLineInputs,
  type DraftInvoiceLine,
} from "../InvoiceLineEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteInvoice,
  duplicateInvoice,
  markInvoiceUnpaid,
  saveInvoiceTemplate,
  sendInvoice,
  updateInvoice,
  updateInvoiceLineItems,
  voidInvoice,
} from "@/lib/invoices/actions";
import {
  INVOICE_LINE_KIND_LABEL,
  invoiceLineAmount,
} from "@/lib/invoices/lines";
import { formatInvoiceMoney, invoiceTotal } from "@/lib/invoices/money";
import { invoiceEffectiveDueDate } from "@/lib/invoices/schedule";
import {
  invoiceStatusLabel,
  invoiceStatusPillVariant,
  isInvoiceOverdue,
} from "@/lib/invoices/status";
import type { InvoiceRow } from "@/lib/invoices/types";
import { invoicePublicUrl } from "@/lib/invoices/url";
import { InvoicePayments } from "./InvoicePayments";
import { InvoiceSchedule } from "./InvoiceSchedule";

function toDraftLines(invoice: InvoiceRow): DraftInvoiceLine[] {
  if (invoice.line_items.length === 0) return [emptyDraftLine()];
  return invoice.line_items.map((item) => ({
    key: item.id,
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    kind: item.kind,
  }));
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="default"
      onClick={copy}
      className="shrink-0 px-3 py-1.5 text-[13px]"
    >
      {copied ? "Copied" : "Copy link"}
    </Button>
  );
}

export function InvoiceDetail({ invoice }: { invoice: InvoiceRow }) {
  const router = useRouter();
  const draft = invoice.status === "draft";
  const overdue = isInvoiceOverdue(
    invoiceEffectiveDueDate({
      dueDate: invoice.due_date,
      nextDueOn: invoice.nextDue?.due_on,
    }),
    invoice.status,
    new Date(),
    invoice.remaining,
  );
  const canSend = invoice.status !== "void" && !invoice.sent_at;
  const publicUrl = invoicePublicUrl(invoice.access_token);

  const [clientName, setClientName] = useState(invoice.client_name ?? "");
  const [clientEmail, setClientEmail] = useState(invoice.client_email ?? "");
  const [dueDate, setDueDate] = useState(invoice.due_date ?? "");
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [terms, setTerms] = useState(invoice.terms ?? "");
  const [paymentLinkUrl, setPaymentLinkUrl] = useState(
    invoice.payment_link_url ?? "",
  );
  const [lines, setLines] = useState<DraftInvoiceLine[]>(() =>
    toDraftLines(invoice),
  );
  const [templateName, setTemplateName] = useState("");
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<{
    emailSent: boolean;
    url: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      updateInvoice(invoice.id, {
        clientName,
        clientEmail,
        dueDate: dueDate || null,
        notes,
        terms,
        paymentLinkUrl,
      }),
    );
  }

  function handleSaveLines(e: React.FormEvent) {
    e.preventDefault();
    run(() => updateInvoiceLineItems(invoice.id, toLineInputs(lines)));
  }

  function handleSend() {
    setError(null);
    setSendNotice(null);
    startTransition(async () => {
      const result = await sendInvoice(invoice.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSendNotice({ emailSent: result.emailSent, url: result.publicUrl });
      router.refresh();
    });
  }

  function handleDuplicate() {
    setError(null);
    startTransition(async () => {
      const result = await duplicateInvoice(invoice.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/projects/${invoice.project_id}/invoices/${result.id}`);
    });
  }

  function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTemplateNotice(null);
    startTransition(async () => {
      const result = await saveInvoiceTemplate(invoice.id, templateName);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTemplateName("");
      setTemplateNotice("Template saved — use it on New invoice.");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this draft invoice? This cannot be undone.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/projects/${invoice.project_id}/invoices`);
    });
  }

  const liveTotal = invoiceTotal(
    lines.map((line) =>
      invoiceLineAmount(line.kind, line.quantity, line.unitPrice),
    ),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        {invoice.invoice_number ? (
          <p className="text-[13px] font-medium tabular-nums text-muted">
            {invoice.invoice_number}
          </p>
        ) : null}
        <Pill variant={invoiceStatusPillVariant(invoice.status, overdue)}>
          {invoiceStatusLabel(invoice.status, overdue)}
        </Pill>
        <p className="text-[15px] font-medium tabular-nums text-ink">
          {formatInvoiceMoney(invoice.total)}
          {invoice.remaining > 0 && invoice.remaining !== invoice.total ? (
            <span className="ml-2 font-medium text-muted">
              {formatInvoiceMoney(invoice.remaining)} due
            </span>
          ) : null}
        </p>
      </div>

      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}

      {sendNotice ? (
        <div className="space-y-2 rounded-[var(--radius-inner)] bg-well p-4 shadow-recessed">
          <p className="text-[13px] font-medium text-ink">
            {sendNotice.emailSent
              ? `Invoice sent to ${invoice.client_email}`
              : "Invoice marked sent — email didn't send, share this link"}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <p className="min-w-0 flex-1 break-all text-[13px] text-muted">
              {sendNotice.url}
            </p>
            <CopyLink url={sendNotice.url} />
          </div>
        </div>
      ) : null}

      <Card className="space-y-4 p-6">
        <h2 className="font-display text-[19px] tracking-[-0.02em] text-ink">
          Details
        </h2>
        <form onSubmit={handleSaveDetails} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="detail-client-name" className="text-sm font-medium text-ink">
                Client name
              </label>
              <Input
                id="detail-client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                disabled={isPending || invoice.status === "void"}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="detail-client-email" className="text-sm font-medium text-ink">
                Client email
              </label>
              <Input
                id="detail-client-email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                disabled={isPending || invoice.status === "void"}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="detail-due-date" className="text-sm font-medium text-ink">
              Due date
            </label>
            <Input
              id="detail-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={isPending || invoice.status === "void"}
              className="max-w-xs"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="detail-payment-link" className="text-sm font-medium text-ink">
              Payment link
            </label>
            <Input
              id="detail-payment-link"
              type="url"
              value={paymentLinkUrl}
              onChange={(e) => setPaymentLinkUrl(e.target.value)}
              disabled={isPending || invoice.status === "void"}
              placeholder="https://venmo.com/u/…"
            />
            <p className="text-[13px] text-muted">
              Venmo, Zelle, Stripe, or any URL. First Look never sees the payment.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="detail-notes" className="text-sm font-medium text-ink">
              Notes
            </label>
            <Textarea
              id="detail-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending || invoice.status === "void"}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="detail-terms" className="text-sm font-medium text-ink">
              Terms
            </label>
            <Textarea
              id="detail-terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              disabled={isPending || invoice.status === "void"}
              rows={3}
              placeholder="Due on receipt. Late fees after 15 days."
            />
          </div>
          {invoice.status !== "void" ? (
            <Button type="submit" variant="default" disabled={isPending}>
              {isPending ? "Saving…" : "Save details"}
            </Button>
          ) : null}
        </form>
      </Card>

      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-[19px] tracking-[-0.02em] text-ink">
            Line items
          </h2>
          <p className="text-[15px] font-medium tabular-nums text-ink">
            Total {formatInvoiceMoney(draft ? liveTotal : invoice.total)}
          </p>
        </div>
        {draft ? (
          <form onSubmit={handleSaveLines} className="space-y-3">
            <InvoiceLineEditor
              lines={lines}
              disabled={isPending}
              onChange={setLines}
            />
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Saving…" : "Save line items"}
            </Button>
          </form>
        ) : (
          <ul className="space-y-2">
            {invoice.line_items.map((item) => (
              <li
                key={item.id}
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
        )}
      </Card>

      <InvoiceSchedule
        key={`${invoice.id}-sched-${invoice.schedule.length}`}
        invoice={invoice}
        onChanged={() => router.refresh()}
      />

      <InvoicePayments
        key={`${invoice.id}-${invoice.payments.length}-${invoice.collected}`}
        invoice={invoice}
        onChanged={() => router.refresh()}
      />

      <Card className="space-y-3 p-6">
        <h2 className="font-display text-[19px] tracking-[-0.02em] text-ink">
          Actions
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {canSend ? (
            <Button
              type="button"
              variant="primary"
              disabled={isPending}
              onClick={handleSend}
            >
              Send
            </Button>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 break-all text-[13px] text-muted">
              {publicUrl}
            </p>
            <CopyLink url={publicUrl} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            disabled={isPending}
            onClick={handleDuplicate}
          >
            Duplicate
          </Button>
          {invoice.status === "paid" && invoice.collected <= 0 ? (
            <Button
              type="button"
              variant="default"
              disabled={isPending}
              onClick={() => run(() => markInvoiceUnpaid(invoice.id))}
            >
              Mark unpaid
            </Button>
          ) : null}
          {invoice.status !== "void" &&
          invoice.status !== "paid" &&
          invoice.collected <= 0 ? (
            <Button
              type="button"
              variant="default"
              disabled={isPending}
              onClick={() => run(() => voidInvoice(invoice.id))}
            >
              Void
            </Button>
          ) : null}
          {draft && invoice.collected <= 0 ? (
            <Button
              type="button"
              variant="default"
              disabled={isPending}
              onClick={handleDelete}
            >
              Delete
            </Button>
          ) : null}
        </div>
        <form
          onSubmit={handleSaveTemplate}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <label htmlFor="template-name" className="text-sm font-medium text-ink">
              Save as template
            </label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              disabled={isPending}
              placeholder="Planning retainer"
            />
          </div>
          <Button type="submit" variant="default" disabled={isPending}>
            Save template
          </Button>
        </form>
        {templateNotice ? (
          <p className="text-[13px] text-sage">{templateNotice}</p>
        ) : null}
      </Card>
    </div>
  );
}
