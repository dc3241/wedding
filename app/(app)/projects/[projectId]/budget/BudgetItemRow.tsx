"use client";

import { useEffect, useState, useTransition } from "react";
import {
  removeBudgetItem,
  setBudgetItemProjectVendor,
  updateBudgetItem,
} from "./actions";
import type {
  BudgetItemForAggregate,
  ProjectVendorOption,
} from "@/lib/budget-aggregates";
import { formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/cn";

function parseAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : Math.max(0, parsed);
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
    <div className="flex h-9 items-center gap-1 rounded-[var(--radius-inner)] border border-ring bg-surface px-2.5">
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
          "min-w-0 flex-1 border-0 bg-transparent text-right text-[14px] font-medium tabular-nums outline-none placeholder:text-muted",
          muted ? "text-muted" : "text-ink",
        )}
      />
    </div>
  );
}

function lineDisplayName(item: {
  category: string | null;
  label: string;
}): string {
  const category = item.category?.trim() ?? "";
  return category !== "" ? category : item.label;
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
  item,
  projectVendors,
  allItems,
}: {
  item: BudgetItemForAggregate;
  projectVendors: ProjectVendorOption[];
  allItems: BudgetItemForAggregate[];
}) {
  const [label, setLabel] = useState(item.label);
  const [planned, setPlanned] = useState(String(item.planned_amount));
  const [actual, setActual] = useState(
    item.actual_amount !== null ? String(item.actual_amount) : "",
  );
  const [linkError, setLinkError] = useState<string | null>(null);
  // Immediate soft warning on select; cleared when server link catches up.
  const [optimisticWarning, setOptimisticWarning] = useState<string | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLabel(item.label);
  }, [item.label]);

  useEffect(() => {
    setPlanned(String(item.planned_amount));
  }, [item.planned_amount]);

  useEffect(() => {
    setActual(item.actual_amount !== null ? String(item.actual_amount) : "");
  }, [item.actual_amount]);

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

  function saveLabel() {
    const trimmed = label.trim();
    if (!trimmed || trimmed === item.label) {
      setLabel(item.label);
      return;
    }
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
    const current =
      item.actual_amount !== null ? String(item.actual_amount) : "";
    if (trimmed === current) return;

    const parsed = trimmed ? parseAmount(trimmed) : null;
    const nextActual = parsed ?? null;
    const currentActual = item.actual_amount;

    if (nextActual === currentActual) return;

    startTransition(async () => {
      await updateBudgetItem(item.id, { actual_amount: nextActual });
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
        "mb-2 space-y-2.5 rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed last:mb-0",
        isPending && "opacity-60",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_96px_96px_52px] items-center gap-x-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Line item label"
          className="min-w-0 truncate bg-transparent text-[15px] font-medium text-ink outline-none"
        />
        <AmountField
          value={planned}
          onChange={setPlanned}
          onBlur={savePlanned}
          ariaLabel={`Planned amount for ${item.label}`}
        />
        <AmountField
          value={actual}
          onChange={setActual}
          onBlur={saveActual}
          ariaLabel={`Actual amount for ${item.label}`}
          placeholder="0"
          muted
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="justify-self-end text-[13px] font-medium text-muted transition-colors hover:text-rosewood disabled:opacity-50"
        >
          Delete
        </button>
      </div>

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
    </li>
  );
}
