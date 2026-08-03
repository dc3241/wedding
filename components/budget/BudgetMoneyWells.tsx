"use client";

import { useState, useTransition } from "react";
import {
  addBudgetPayment,
  addScheduleInstallment,
  removeBudgetPayment,
  removeScheduleInstallment,
} from "@/app/(app)/projects/[projectId]/budget/actions";
import type {
  BudgetPaymentForAggregate,
  ScheduleInstallmentForAggregate,
} from "@/lib/budget-aggregates";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/cn";
import { toLocalDateKey } from "@/app/(app)/calendar/calendar-source";

/** Minimal shape shared by Budget row and booked vendor card (VND-13). */
export type BudgetMoneyWellItem = {
  id: string;
  schedule: ScheduleInstallmentForAggregate[];
  payments: BudgetPaymentForAggregate[];
};

function parseAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : Math.max(0, parsed);
}

/** Local-date render — date column only, no UTC shift (CAL-01 class). */
function formatLocalDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AmountField({
  id,
  value,
  onChange,
  onBlur,
  ariaLabel,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  ariaLabel: string;
  placeholder?: string;
}) {
  return (
    <div className="flex h-9 w-full min-w-0 items-center gap-1 rounded-[var(--radius-inner)] border border-ring bg-surface px-2.5">
      <span className="shrink-0 text-[13px] text-muted" aria-hidden>
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-w-0 w-full flex-1 border-0 bg-transparent text-right text-[14px] font-medium tabular-nums text-ink outline-none placeholder:text-muted"
      />
    </div>
  );
}

export function PaymentScheduleWell({
  projectId,
  item,
  className,
}: {
  projectId: string;
  item: BudgetMoneyWellItem;
  className?: string;
}) {
  const [amount, setAmount] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [label, setLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const todayKey = toLocalDateKey(new Date());

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseAmount(amount);
    if (parsed === null) {
      setError("Enter an installment amount.");
      return;
    }
    if (!dueOn.trim()) {
      setError("Pick the due date.");
      return;
    }

    startTransition(async () => {
      try {
        await addScheduleInstallment(
          projectId,
          item.id,
          parsed,
          dueOn,
          label.trim() || null,
        );
        setAmount("");
        setDueOn("");
        setLabel("");
        setShowAdd(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not add installment.",
        );
      }
    });
  }

  function handleRemove(installmentId: string) {
    startTransition(async () => {
      await removeScheduleInstallment(installmentId);
    });
  }

  return (
    <div className={cn("border-t border-hairline pt-3", className)}>
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Payment schedule
      </p>
      {item.schedule.length === 0 ? (
        <p className="mb-2 text-[13px] text-muted">No installments yet.</p>
      ) : (
        <ul className="mb-2">
          {item.schedule.map((installment) => {
            const pastDue =
              !installment.covered && installment.due_on < todayKey;
            return (
              <li
                key={installment.id}
                className="flex items-center justify-between gap-3 border-t border-hairline py-2 first:border-t-0 first:pt-0"
              >
                <span className="min-w-0 text-[13px] text-ink">
                  {installment.label ? (
                    <span className="font-medium">{installment.label}</span>
                  ) : (
                    <span className="font-medium text-muted">Installment</span>
                  )}
                  {" · "}
                  <span className="font-medium tabular-nums">
                    {formatCurrency(installment.amount)}
                  </span>
                  {" · "}
                  <span
                    className={cn(
                      "tabular-nums",
                      pastDue ? "text-rosewood" : "text-muted",
                    )}
                  >
                    {formatLocalDate(installment.due_on)}
                    {pastDue ? " · past due" : ""}
                  </span>
                  {installment.covered ? (
                    <>
                      {" · "}
                      <span
                        className="text-muted"
                        title="Covered by payments"
                      >
                        ✓ covered by payments
                      </span>
                    </>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(installment.id)}
                  disabled={isPending}
                  className="shrink-0 text-[13px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showAdd ? (
        <form
          onSubmit={handleAdd}
          className="space-y-2 border-t border-hairline pt-2"
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor={`sched-amount-${item.id}`}
                className="text-[12px] font-medium text-muted"
              >
                Amount
              </label>
              <AmountField
                id={`sched-amount-${item.id}`}
                value={amount}
                onChange={setAmount}
                onBlur={() => {}}
                ariaLabel="Installment amount"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`sched-due-${item.id}`}
                className="text-[12px] font-medium text-muted"
              >
                Due on
              </label>
              <input
                id={`sched-due-${item.id}`}
                type="date"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
                required
                className="h-9 w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-2.5 text-[13px] font-medium tabular-nums text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`sched-label-${item.id}`}
                className="text-[12px] font-medium text-muted"
              >
                Label{" "}
                <span className="font-normal">(optional)</span>
              </label>
              <input
                id={`sched-label-${item.id}`}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Deposit"
                className="h-9 w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-2.5 text-[13px] font-medium text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </div>
          </div>
          {error ? (
            <p className="text-[13px] text-rosewood" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-[var(--radius-pill)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-surface disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save installment"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setError(null);
              }}
              disabled={isPending}
              className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="text-[13px] font-semibold text-accent transition-colors hover:text-ink"
        >
          + Add installment
        </button>
      )}
    </div>
  );
}

export function PaymentLedgerWell({
  projectId,
  item,
  className,
}: {
  projectId: string;
  item: BudgetMoneyWellItem;
  className?: string;
}) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [note, setNote] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseAmount(amount);
    if (parsed === null || parsed <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    if (!paidOn.trim()) {
      setError("Pick the date this was paid.");
      return;
    }

    startTransition(async () => {
      try {
        await addBudgetPayment(
          projectId,
          item.id,
          parsed,
          paidOn,
          note.trim() || null,
        );
        setAmount("");
        setPaidOn("");
        setNote("");
        setShowAdd(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add payment.");
      }
    });
  }

  function handleRemove(paymentId: string) {
    startTransition(async () => {
      await removeBudgetPayment(paymentId);
    });
  }

  return (
    <div className={cn("border-t border-hairline pt-3", className)}>
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Payments
      </p>
      {item.payments.length === 0 ? (
        <p className="mb-2 text-[13px] text-muted">No payments logged yet.</p>
      ) : (
        <ul className="mb-2">
          {item.payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-center justify-between gap-3 border-t border-hairline py-2 first:border-t-0 first:pt-0"
            >
              <span className="min-w-0 text-[13px] text-ink">
                <span className="font-medium tabular-nums">
                  {formatCurrency(payment.amount)}
                </span>
                {payment.paid_on ? (
                  <>
                    {" · "}
                    <span className="tabular-nums text-muted">
                      {formatLocalDate(payment.paid_on)}
                    </span>
                  </>
                ) : null}
                {payment.note ? (
                  <>
                    {" · "}
                    <span className="text-muted">{payment.note}</span>
                  </>
                ) : null}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(payment.id)}
                disabled={isPending}
                className="shrink-0 text-[13px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAdd ? (
        <form
          onSubmit={handleAdd}
          className="space-y-2 border-t border-hairline pt-2"
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <label
                htmlFor={`pay-amount-${item.id}`}
                className="text-[12px] font-medium text-muted"
              >
                Amount
              </label>
              <AmountField
                id={`pay-amount-${item.id}`}
                value={amount}
                onChange={setAmount}
                onBlur={() => {}}
                ariaLabel="Payment amount"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`pay-on-${item.id}`}
                className="text-[12px] font-medium text-muted"
              >
                Paid on
              </label>
              <input
                id={`pay-on-${item.id}`}
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                required
                className="h-9 w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-2.5 text-[13px] font-medium tabular-nums text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor={`pay-note-${item.id}`}
                className="text-[12px] font-medium text-muted"
              >
                Note{" "}
                <span className="font-normal">(optional)</span>
              </label>
              <input
                id={`pay-note-${item.id}`}
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Deposit"
                className="h-9 w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-2.5 text-[13px] font-medium text-ink outline-none placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </div>
          </div>
          {error ? (
            <p className="text-[13px] text-rosewood" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-[var(--radius-pill)] bg-accent px-3 py-1.5 text-[13px] font-semibold text-surface disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save payment"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setError(null);
              }}
              disabled={isPending}
              className="rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] font-medium text-muted hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="text-[13px] font-semibold text-accent transition-colors hover:text-ink"
        >
          + Add payment
        </button>
      )}
    </div>
  );
}
