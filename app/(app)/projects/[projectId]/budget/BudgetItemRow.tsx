"use client";

import { useEffect, useState, useTransition } from "react";
import {
  removeBudgetItem,
  setBudgetItemProjectVendor,
  updateBudgetItem,
} from "./actions";
import {
  PaymentLedgerWell,
  PaymentScheduleWell,
} from "@/components/budget/BudgetMoneyWells";
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

  // Paid / Actual ramp — display only. Denominator: actual when set, else
  // planned (Estimate). Actual null + planned 0 → empty (untracked). Denom 0
  // with actual set → sage full (avoid /0 → NaN).
  const rampDenom =
    item.actual_amount !== null
      ? Number(item.actual_amount)
      : Number(item.planned_amount);
  const rampTracked = item.actual_amount !== null || rampDenom > 0;
  let paidFillPct = 0;
  let paidFillTone: "rosewood" | "clay" | "sage" | null = null;
  if (rampTracked) {
    if (rampDenom === 0) {
      paidFillPct = 100;
      paidFillTone = "sage";
    } else {
      const fraction = Math.min(1, Math.max(0, item.paid / rampDenom));
      paidFillPct = fraction * 100;
      paidFillTone =
        fraction < 0.5 ? "rosewood" : fraction < 1 ? "clay" : "sage";
    }
  }

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
      id={`budget-item-${item.id}`}
      className={cn(
        "mb-2 space-y-3 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed last:mb-0 scroll-mt-6",
        isPending && "opacity-60",
      )}
    >
      {/* (a) Label · Actual · Delete */}
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
        <div className="w-[7.25rem] shrink-0">
          <AmountField
            value={actual}
            onChange={setActual}
            onBlur={saveActual}
            ariaLabel={`Actual amount for ${rowName}`}
            placeholder="0"
            muted
          />
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label={`Delete ${rowName}`}
          className="shrink-0 rounded-[var(--radius-inner)] p-1.5 text-muted transition-colors hover:bg-rosewood-wash hover:text-rosewood focus-visible:bg-rosewood-wash focus-visible:text-rosewood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rosewood disabled:opacity-50"
        >
          <svg
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden
          >
            <path d="M3.5 4.5h9M6.5 4.5V3.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75V4.5m1.5 0V12.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4.5" />
            <path d="M7 7v4.5M9 7v4.5" />
          </svg>
        </button>
      </div>

      {/* (b) Paid / Actual progress ramp */}
      <div
        className="h-2 overflow-hidden rounded-[var(--radius-pill)] bg-surface shadow-recessed"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(paidFillPct)}
        aria-label={
          !rampTracked
            ? `Payment progress for ${rowName} · no amount set`
            : `Payment progress for ${rowName} · ${Math.round(paidFillPct)}% paid`
        }
      >
        {paidFillTone != null && paidFillPct > 0 ? (
          <div
            className={cn(
              "h-full rounded-[var(--radius-pill)] transition-[width] duration-300",
              paidFillTone === "rosewood" && "bg-rosewood",
              paidFillTone === "clay" && "bg-clay",
              paidFillTone === "sage" && "bg-sage",
            )}
            style={{ width: `${paidFillPct}%` }}
          />
        ) : null}
      </div>

      {/* (c) Total paid — ledger sum (was grid Paid) */}
      <p
        className="text-[13px] font-medium tabular-nums text-ink"
        aria-label={`Total paid for ${rowName}`}
      >
        Total paid{"  "}
        {formatCurrency(item.paid)}
      </p>

      {/* (d) Next due — earliest unpaid installment; hidden when fully covered */}
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

      {/* (e)+(f) Hairline · Budget (Estimate) + Difference delta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hairline pt-3">
        <label
          htmlFor={`budget-estimate-${item.id}`}
          className="shrink-0 text-[13px] font-medium text-muted"
        >
          Budget
        </label>
        <div className="w-[7.25rem] shrink-0">
          <AmountField
            id={`budget-estimate-${item.id}`}
            value={planned}
            onChange={setPlanned}
            onBlur={savePlanned}
            ariaLabel={`Budget for ${rowName}`}
          />
        </div>
        {/* Difference only when Actual is set — rosewood over / sage under */}
        {hasActual ? (
          <span
            className={cn(
              "text-[13px] font-medium tabular-nums",
              differenceTone,
            )}
            aria-label={`Difference for ${rowName}`}
          >
            {formatSignedCurrency(item.difference)}
          </span>
        ) : null}
      </div>

      <PaymentScheduleWell projectId={projectId} item={item} />

      <PaymentLedgerWell projectId={projectId} item={item} />

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
              className="h-9 max-w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-2.5 text-[13px] font-medium text-ink disabled:opacity-50"
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
