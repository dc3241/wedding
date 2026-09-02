"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteInvoice,
  markInvoicePaid,
  markInvoiceUnpaid,
  sendInvoice,
  updateInvoice,
  updateInvoiceLineItems,
  voidInvoice,
} from "@/lib/invoices/actions";
import { formatInvoiceMoney, invoiceTotal } from "@/lib/invoices/money";
import {
  invoiceStatusLabel,
  invoiceStatusPillVariant,
  isInvoiceOverdue,
} from "@/lib/invoices/status";
import type { InvoiceLineItemInput, InvoiceRow } from "@/lib/invoices/types";
import { invoicePublicUrl } from "@/lib/invoices/url";

type DraftLine = InvoiceLineItemInput & { key: string };

function toDraftLines(invoice: InvoiceRow): DraftLine[] {
  if (invoice.line_items.length === 0) {
    return [{ key: crypto.randomUUID(), description: "", amount: 0 }];
  }
  return invoice.line_items.map((item) => ({
    key: item.id,
    description: item.description,
    amount: item.amount,
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
  const overdue = isInvoiceOverdue(invoice.due_date, invoice.status);
  const publicUrl = invoicePublicUrl(invoice.access_token);

  const [clientName, setClientName] = useState(invoice.client_name ?? "");
  const [clientEmail, setClientEmail] = useState(invoice.client_email ?? "");
  const [dueDate, setDueDate] = useState(invoice.due_date ?? "");
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [paymentLinkUrl, setPaymentLinkUrl] = useState(
    invoice.payment_link_url ?? "",
  );
  const [lines, setLines] = useState<DraftLine[]>(() => toDraftLines(invoice));
  const [error, setError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<{
    emailSent: boolean;
    url: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateLine(key: string, patch: Partial<InvoiceLineItemInput>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

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
        paymentLinkUrl,
      }),
    );
  }

  function handleSaveLines(e: React.FormEvent) {
    e.preventDefault();
    run(() =>
      updateInvoiceLineItems(
        invoice.id,
        lines.map(({ description, amount }) => ({ description, amount })),
      ),
    );
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

  const liveTotal = invoiceTotal(lines.map((line) => line.amount));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Pill variant={invoiceStatusPillVariant(invoice.status, overdue)}>
          {invoiceStatusLabel(invoice.status, overdue)}
        </Pill>
        <p className="text-[15px] font-medium tabular-nums text-ink">
          {formatInvoiceMoney(invoice.total)}
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
            {lines.map((line, index) => (
              <div
                key={line.key}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <Input
                  aria-label={`Line ${index + 1} description`}
                  value={line.description}
                  onChange={(e) =>
                    updateLine(line.key, { description: e.target.value })
                  }
                  disabled={isPending}
                  className="sm:flex-1"
                />
                <Input
                  aria-label={`Line ${index + 1} amount`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={Number.isFinite(line.amount) ? line.amount : 0}
                  onChange={(e) =>
                    updateLine(line.key, { amount: Number(e.target.value) })
                  }
                  disabled={isPending}
                  className="sm:w-32"
                />
                {lines.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((item) => item.key !== line.key),
                      )
                    }
                    className="px-3 py-1.5 text-[13px]"
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                disabled={isPending}
                onClick={() =>
                  setLines((current) => [
                    ...current,
                    { key: crypto.randomUUID(), description: "", amount: 0 },
                  ])
                }
                className="px-3 py-1.5 text-[13px]"
              >
                Add line
              </Button>
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? "Saving…" : "Save line items"}
              </Button>
            </div>
          </form>
        ) : (
          <ul className="space-y-2">
            {invoice.line_items.map((item) => (
              <li
                key={item.id}
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
        )}
      </Card>

      <Card className="space-y-3 p-6">
        <h2 className="font-display text-[19px] tracking-[-0.02em] text-ink">
          Actions
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {draft ? (
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
          {invoice.status === "paid" ? (
            <Button
              type="button"
              variant="default"
              disabled={isPending}
              onClick={() => run(() => markInvoiceUnpaid(invoice.id))}
            >
              Mark unpaid
            </Button>
          ) : invoice.status !== "void" ? (
            <Button
              type="button"
              variant="default"
              disabled={isPending}
              onClick={() => run(() => markInvoicePaid(invoice.id))}
            >
              Mark paid
            </Button>
          ) : null}
          {invoice.status !== "paid" && invoice.status !== "void" ? (
            <Button
              type="button"
              variant="default"
              disabled={isPending}
              onClick={() => run(() => voidInvoice(invoice.id))}
            >
              Void
            </Button>
          ) : null}
          {draft ? (
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
      </Card>
    </div>
  );
}
