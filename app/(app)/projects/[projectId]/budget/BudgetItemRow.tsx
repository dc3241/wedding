"use client";

import { useEffect, useState, useTransition } from "react";
import {
  addBudgetPayment,
  addScheduleInstallment,
  removeBudgetItem,
  removeBudgetPayment,
  removeScheduleInstallment,
  setBudgetItemProjectVendor,
  updateBudgetItem,
} from "./actions";
import type {
  BudgetItemForAggregate,
  ProjectVendorOption,
} from "@/lib/budget-aggregates";
import { formatCurrency } from "@/lib/format-currency";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { todayLocalDateKey } from "./BudgetFilterBar";

function parseAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : Math.max(0, parsed);
}

/** Null or zero → empty so typing doesn't lead with a stored "0". */
function amountToInput(amount: number | null) {
  return amount !== null && Number(amount) !== 0 ? String(amount) : "";
}

/** Local-date render — date column only, no UTC shift (CAL-01 class). */
function formatLocalDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSignedCurrency(amount: number) {
  const abs = formatCurrency(Math.abs(amount));
  if (amount > 0) return `+${abs}`;
  if (amount < 0) return `−${abs}`;
  return abs;
}

function AmountField({
  id,
  value,
  onChange,
  onBlur,
  ariaLabel,
  placeholder,
  muted = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  ariaLabel: string;
  placeholder?: string;
  muted?: boolean;
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
        className={cn(
          "min-w-0 w-full flex-1 border-0 bg-transparent text-right text-[14px] font-medium tabular-nums outline-none placeholder:text-muted",
          muted ? "text-muted" : "text-ink",
        )}
      />
    </div>
  );
}

function lineDisplayName(item: {
  category: string | null;
  label: string | null;
}): string {
  const category = item.category?.trim() ?? "";
  if (category !== "") return category;
  const label = item.label?.trim() ?? "";
  return label !== "" ? label : "No vendor yet";
}

function formatAlsoLinkedList(names: string[]): string {
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function alsoLinkedWarning(
  vendorId: string,
  vendorName: string,
  currentItemId: string,
  allItems: BudgetItemForAggregate[],
): string | null {
  const others = allItems.filter(
    (row) =>
      row.id !== currentItemId && row.project_vendor_id === vendorId,
  );
  if (others.length === 0) return null;

  const names = [
    ...new Set(others.map((row) => lineDisplayName(row))),
  ];
  return `${vendorName} is also linked to ${formatAlsoLinkedList(names)}`;
}

function VendorVariance({ item }: { item: BudgetItemForAggregate }) {
  const linked = item.linkedVendor;
  if (!linked) return null;

  // Multi-line package: neutral context only — no over/under status colour.
  if (item.linkedItemCount > 1) {
    return (
      <span className="text-[13px] text-muted">
        Part of {linked.name} package · covers {item.linkedItemCount} lines
      </span>
    );
  }

  // linkedItemCount === 1: BUD-01a per-line over/under (single-element sum).
  if (linked.quotedPrice == null || item.quoteVariance == null) {
    return <span className="text-[13px] text-muted">{linked.name}</span>;
  }

  const over = item.quoteVariance > 0;
  const equal = item.quoteVariance === 0;
  const varianceLabel = equal
    ? "on plan"
    : over
      ? `${formatCurrency(item.quoteVariance)} over plan`
      : `${formatCurrency(Math.abs(item.quoteVariance))} under plan`;

  return (
    <span className="text-[13px] text-muted">
      <span className="tabular-nums">
        {formatCurrency(linked.quotedPrice)} quoted
      </span>
      {" · "}
      <span
        className={cn("tabular-nums", over ? "text-rosewood" : "text-muted")}
      >
        {varianceLabel}
      </span>
    </span>
  );
}

function PaymentSchedule({
  projectId,
  item,
}: {
  projectId: string;
  item: BudgetItemForAggregate;
}) {
  const [amount, setAmount] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [label, setLabel] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    <div className="border-t border-hairline pt-3">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
        Payment schedule
      </p>
      {item.schedule.length === 0 ? (
        <p className="mb-2 text-[13px] text-muted">No installments yet.</p>
      ) : (
        <ul className="mb-2">
          {item.schedule.map((installment) => (
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
                <span className="tabular-nums text-muted">
                  {formatLocalDate(installment.due_on)}
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

function PaymentLedger({
  projectId,
  item,
}: {
  projectId: string;
  item: BudgetItemForAggregate;
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
    <div className="border-t border-hairline pt-3">
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
        <form onSubmit={handleAdd} className="space-y-2 border-t border-hairline pt-2">
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

export function BudgetItemRow({
  projectId,
  item,
  projectVendors,
  allItems,
}: {
  projectId: string;
  item: BudgetItemForAggregate;
  projectVendors: ProjectVendorOption[];
  allItems: BudgetItemForAggregate[];
}) {
  const [label, setLabel] = useState(item.label ?? "");
  const [planned, setPlanned] = useState(String(item.planned_amount));
  const [actual, setActual] = useState(amountToInput(item.actual_amount));
  const [notes, setNotes] = useState(item.notes ?? "");
  const [linkError, setLinkError] = useState<string | null>(null);
  // Immediate soft warning on select; cleared when server link catches up.
  const [optimisticWarning, setOptimisticWarning] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLabel(item.label ?? "");
  }, [item.label]);

  useEffect(() => {
    setPlanned(String(item.planned_amount));
  }, [item.planned_amount]);

  useEffect(() => {
    setActual(amountToInput(item.actual_amount));
  }, [item.actual_amount]);

  useEffect(() => {
    setNotes(item.notes ?? "");
  }, [item.notes]);

  useEffect(() => {
    setOptimisticWarning(null);
  }, [item.project_vendor_id]);

  const derivedWarning =
    item.project_vendor_id && item.linkedVendor
      ? alsoLinkedWarning(
          item.project_vendor_id,
          item.linkedVendor.name,
          item.id,
          allItems,
        )
      : null;
  const linkWarning = optimisticWarning ?? derivedWarning;
  const rowName = lineDisplayName(item);
  const hasActual = item.actual_amount !== null;
  const differenceTone =
    item.difference < 0 ? "text-rosewood" : "text-sage";
  const todayKey = todayLocalDateKey();
  const nextDuePast =
    item.nextDue != null && item.nextDue.due_on < todayKey;

  function saveLabel() {
    const trimmed = label.trim();
    const current = item.label ?? "";
    if (trimmed === current) return;
    startTransition(async () => {
      await updateBudgetItem(item.id, { label: trimmed });
    });
  }

  function savePlanned() {
    const parsed = parseAmount(planned);
    if (parsed === null) {
      setPlanned(String(item.planned_amount));
      return;
    }
    if (parsed === item.planned_amount) return;
    startTransition(async () => {
      await updateBudgetItem(item.id, { planned_amount: parsed });
    });
  }

  function saveActual() {
    const trimmed = actual.trim();
    const current = amountToInput(item.actual_amount);
    if (trimmed === current) return;

    const parsed = trimmed ? parseAmount(trimmed) : null;
    const nextActual = parsed ?? null;
    const currentActual = item.actual_amount;

    if (nextActual === currentActual) return;

    startTransition(async () => {
      await updateBudgetItem(item.id, { actual_amount: nextActual });
    });
  }

  function saveNotes() {
    const next = notes.trim() || null;
    const current = (item.notes ?? "").trim() || null;
    if (next === current) return;
    startTransition(async () => {
      await updateBudgetItem(item.id, { notes: notes });
    });
  }

  function handleDelete() {
    if (!window.confirm("Delete this budget item?")) return;
    startTransition(async () => {
      await removeBudgetItem(item.id);
    });
  }

  function handleVendorChange(value: string) {
    const next = value === "" ? null : value;
    const current = item.project_vendor_id;
    if (next === current) return;

    setLinkError(null);

    if (next == null) {
      setOptimisticWarning(null);
    } else {
      const vendor = projectVendors.find((v) => v.id === next);
      setOptimisticWarning(
        vendor
          ? alsoLinkedWarning(next, vendor.name, item.id, allItems)
          : null,
      );
    }

    startTransition(async () => {
      const result = await setBudgetItemProjectVendor(item.id, next);
      if (!result.ok) {
        setLinkError(result.error);
        setOptimisticWarning(null);
      }
    });
  }

  return (
    <li
      className={cn(
        "mb-2 space-y-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed last:mb-0",
        isPending && "opacity-60",
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="No vendor yet"
          aria-label="Vendor name"
          className="min-w-0 flex-1 truncate bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="shrink-0 text-[13px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 items-start lg:grid-cols-4">
        <div className="min-w-0 space-y-1">
          <label className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Estimate
          </label>
          <AmountField
            value={planned}
            onChange={setPlanned}
            onBlur={savePlanned}
            ariaLabel={`Estimate for ${rowName}`}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <label className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Actual
          </label>
          <AmountField
            value={actual}
            onChange={setActual}
            onBlur={saveActual}
            ariaLabel={`Actual amount for ${rowName}`}
            placeholder="0"
            muted
          />
        </div>
        <div className="min-w-0 space-y-1">
          <label className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Difference
          </label>
          {/* Gate on actual_amount: Estimate − 0 is nonsense when unpriced.
              Once Actual exists (incl. 0), ±Difference is real — matches over-plan alerts. */}
          <div
            className={cn(
              "h-9 text-left text-[14px] font-medium tabular-nums leading-9",
              hasActual ? differenceTone : "text-muted",
            )}
            aria-label={`Difference for ${rowName}`}
          >
            {hasActual ? formatSignedCurrency(item.difference) : "—"}
          </div>
        </div>
        <div className="min-w-0 space-y-1">
          <label className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
            Paid
          </label>
          <div
            className="h-9 text-left text-[14px] font-medium tabular-nums leading-9 text-ink"
            aria-label={`Paid for ${rowName}`}
          >
            {formatCurrency(item.paid)}
          </div>
        </div>
      </div>

      {item.nextDue ? (
        <p
          className={cn(
            "text-[13px] font-medium tabular-nums",
            nextDuePast ? "text-rosewood" : "text-muted",
          )}
        >
          {formatCurrency(item.nextDue.amount)} next due{" "}
          {formatLocalDate(item.nextDue.due_on)}
          {item.nextDue.label ? ` · ${item.nextDue.label}` : ""}
          {nextDuePast ? " · past due" : ""}
        </p>
      ) : null}

      <PaymentSchedule projectId={projectId} item={item} />

      <PaymentLedger projectId={projectId} item={item} />

      {projectVendors.length > 0 ? (
        <div className="space-y-1.5">
          <label
            htmlFor={`budget-vendor-${item.id}`}
            className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted"
          >
            Vendor
          </label>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <select
              id={`budget-vendor-${item.id}`}
              value={item.project_vendor_id ?? ""}
              onChange={(e) => handleVendorChange(e.target.value)}
              disabled={isPending}
              className="h-9 max-w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-2.5 text-[13px] font-medium text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            >
              <option value="">Not linked</option>
              {projectVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
            {item.linkedVendor ? <VendorVariance item={item} /> : null}
          </div>
          {linkWarning ? (
            <div className="rounded-[var(--radius-inner)] bg-clay-wash px-3 py-2 text-[13px] text-ink">
              {linkWarning}
            </div>
          ) : null}
          {linkError ? (
            <p className="text-[13px] text-rosewood" role="alert">
              {linkError}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-hairline pt-3">
        <label
          htmlFor={`notes-${item.id}`}
          className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted"
        >
          Notes
        </label>
        <Textarea
          id={`notes-${item.id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={2}
          placeholder="Deposit refundable, balance due week-of…"
          disabled={isPending}
          className="mt-1.5 min-h-[4.5rem] resize-y text-[14px]"
        />
      </div>
    </li>
  );
}
