"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addInvoiceInstallment,
  removeInvoiceInstallment,
} from "@/lib/invoices/actions";
import { formatInvoiceMoney, invoiceLocalDateKey } from "@/lib/invoices/money";
import type { InvoiceRow } from "@/lib/invoices/types";
import { cn } from "@/lib/cn";

function formatDueOn(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvoiceSchedule({
  invoice,
  onChanged,
}: {
  invoice: InvoiceRow;
  onChanged: () => void;
}) {
  const voided = invoice.status === "void";
  const todayKey = invoiceLocalDateKey();
  const [amount, setAmount] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addInvoiceInstallment(invoice.id, {
        amount: Number(amount),
        dueOn,
        label,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAmount("");
      setDueOn("");
      setLabel("");
      onChanged();
    });
  }

  function handleRemove(installmentId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeInvoiceInstallment(invoice.id, installmentId);
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
          Payment plan
        </h2>
        {invoice.nextDue ? (
          <p className="text-[15px] font-medium tabular-nums text-ink">
            {formatInvoiceMoney(invoice.nextDue.remaining)} due{" "}
            {formatDueOn(invoice.nextDue.due_on)}
          </p>
        ) : null}
      </div>
      <p className="text-[13px] text-muted">
        Split what they owe — retainer now, balance later. Recorded payments
        cover these in due-date order.
      </p>

      {error ? (
        <p className="text-[13px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}

      {invoice.schedule.length === 0 ? (
        <p className="text-[13px] text-muted">No installments yet.</p>
      ) : (
        <ul className="space-y-2">
          {invoice.schedule.map((row) => {
            const pastDue = !row.covered && row.due_on < todayKey;
            const isNext = invoice.nextDue?.id === row.id;
            return (
              <li
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-ink">
                    {row.label?.trim() || "Installment"}
                    <span className="ml-2 tabular-nums">
                      {formatInvoiceMoney(row.amount)}
                    </span>
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[13px] tabular-nums",
                      pastDue ? "text-rosewood" : "text-muted",
                    )}
                  >
                    {formatDueOn(row.due_on)}
                    {row.covered
                      ? " · covered"
                      : pastDue
                        ? " · past due"
                        : isNext
                          ? ` · ${formatInvoiceMoney(row.remaining)} due now`
                          : ` · ${formatInvoiceMoney(row.remaining)} open`}
                  </p>
                </div>
                {voided ? null : (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleRemove(row.id)}
                    className="shrink-0 px-3 py-1.5 text-[13px] text-muted hover:text-rosewood"
                  >
                    Remove
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {voided ? null : (
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label
                htmlFor="sched-amount"
                className="text-sm font-medium text-ink"
              >
                Amount
              </label>
              <Input
                id="sched-amount"
                type="number"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isPending}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="sched-due" className="text-sm font-medium text-ink">
                Due on
              </label>
              <Input
                id="sched-due"
                type="date"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="sched-label"
                className="text-sm font-medium text-ink"
              >
                Label{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <Input
                id="sched-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isPending}
                placeholder="Retainer"
              />
            </div>
          </div>
          <Button type="submit" variant="default" disabled={isPending}>
            {isPending ? "Saving…" : "Add installment"}
          </Button>
        </form>
      )}
    </Card>
  );
}
