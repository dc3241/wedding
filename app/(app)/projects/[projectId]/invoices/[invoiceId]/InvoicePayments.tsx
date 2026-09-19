"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  markInvoicePaid,
  recordInvoicePayment,
  removeInvoicePayment,
} from "@/lib/invoices/actions";
import {
  INVOICE_PAYMENT_METHOD_LABEL,
} from "@/lib/invoices/methods";
import {
  formatInvoiceMoney,
  invoiceLocalDateKey,
} from "@/lib/invoices/money";
import {
  INVOICE_PAYMENT_METHODS,
  type InvoicePaymentMethod,
  type InvoiceRow,
} from "@/lib/invoices/types";

function formatPaidOn(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvoicePayments({
  invoice,
  onChanged,
}: {
  invoice: InvoiceRow;
  onChanged: () => void;
}) {
  const voided = invoice.status === "void";
  const remaining = invoice.remaining;
  const [amount, setAmount] = useState(
    remaining > 0 ? remaining.toFixed(2) : "",
  );
  const [paidOn, setPaidOn] = useState(invoiceLocalDateKey());
  const [method, setMethod] = useState<InvoicePaymentMethod>("other");
  const [externalRef, setExternalRef] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await recordInvoicePayment(invoice.id, {
        amount: Number(amount),
        paidOn,
        method,
        note,
        externalRef,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAmount("");
      setExternalRef("");
      setNote("");
      onChanged();
    });
  }

  function handleMarkRemaining() {
    setError(null);
    startTransition(async () => {
      const result = await markInvoicePaid(invoice.id, {
        paidOn,
        method,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChanged();
    });
  }

  function handleRemove(paymentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeInvoicePayment(invoice.id, paymentId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChanged();
    });
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[19px] tracking-[-0.02em] text-ink">
          Payments
        </h2>
        <p className="text-[15px] font-medium tabular-nums text-ink">
          {formatInvoiceMoney(invoice.collected)} collected
          {remaining > 0 ? (
            <span className="text-muted">
              {" "}
              · {formatInvoiceMoney(remaining)} due
            </span>
          ) : null}
        </p>
      </div>

      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}

      {invoice.payments.length === 0 ? (
        <p className="text-[13px] text-muted">
          Record what you collected off First Look — Venmo, Zelle, check, or a
          Stripe link.
        </p>
      ) : (
        <ul className="space-y-2">
          {invoice.payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-start justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium tabular-nums text-ink">
                  {formatInvoiceMoney(payment.amount)}
                  <span className="ml-2 text-[13px] font-medium text-muted">
                    {INVOICE_PAYMENT_METHOD_LABEL[payment.method]}
                  </span>
                </p>
                <p className="mt-0.5 text-[13px] text-muted">
                  {formatPaidOn(payment.paid_on)}
                  {payment.external_ref ? ` · ${payment.external_ref}` : ""}
                  {payment.note ? ` · ${payment.note}` : ""}
                </p>
              </div>
              {voided ? null : (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleRemove(payment.id)}
                  className="shrink-0 px-3 py-1.5 text-[13px] text-muted hover:text-rosewood"
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {voided || remaining <= 0 ? null : (
        <form onSubmit={handleRecord} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="pay-amount"
                className="text-sm font-medium text-ink"
              >
                Amount
              </label>
              <Input
                id="pay-amount"
                type="number"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pay-on" className="text-sm font-medium text-ink">
                Received
              </label>
              <Input
                id="pay-on"
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="pay-method"
                className="text-sm font-medium text-ink"
              >
                Method
              </label>
              <Select
                id="pay-method"
                value={method}
                onChange={(e) =>
                  setMethod(e.target.value as InvoicePaymentMethod)
                }
                disabled={isPending}
              >
                {INVOICE_PAYMENT_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {INVOICE_PAYMENT_METHOD_LABEL[value]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="pay-ref"
                className="text-sm font-medium text-ink"
              >
                Confirmation{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <Input
                id="pay-ref"
                value={externalRef}
                onChange={(e) => setExternalRef(e.target.value)}
                disabled={isPending}
                placeholder="Venmo name or check #"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="pay-note" className="text-sm font-medium text-ink">
              Note <span className="font-normal text-muted">(optional)</span>
            </label>
            <Input
              id="pay-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isPending}
              placeholder="Retainer, remaining balance…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={isPending}>
              {isPending ? "Saving…" : "Record payment"}
            </Button>
            {remaining > 0 ? (
              <Button
                type="button"
                variant="default"
                disabled={isPending}
                onClick={handleMarkRemaining}
              >
                Mark remaining paid
              </Button>
            ) : null}
          </div>
        </form>
      )}
    </Card>
  );
}
