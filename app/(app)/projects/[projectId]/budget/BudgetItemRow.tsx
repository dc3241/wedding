"use client";

import { useEffect, useState, useTransition } from "react";
import { removeBudgetItem, updateBudgetItem } from "./actions";
import type { BudgetItem } from "./types";
import { cn } from "@/lib/cn";

function parseAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : Math.max(0, parsed);
}

export function BudgetItemRow({
  item,
  rowClass,
}: {
  item: BudgetItem;
  rowClass: string;
}) {
  const [category, setCategory] = useState(item.category ?? "");
  const [label, setLabel] = useState(item.label);
  const [planned, setPlanned] = useState(String(item.planned_amount));
  const [actual, setActual] = useState(
    item.actual_amount !== null ? String(item.actual_amount) : "",
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setCategory(item.category ?? "");
  }, [item.category]);

  useEffect(() => {
    setLabel(item.label);
  }, [item.label]);

  useEffect(() => {
    setPlanned(String(item.planned_amount));
  }, [item.planned_amount]);

  useEffect(() => {
    setActual(item.actual_amount !== null ? String(item.actual_amount) : "");
  }, [item.actual_amount]);

  function saveCategory() {
    const next = category.trim();
    const current = item.category ?? "";
    if (next === current) {
      setCategory(current);
      return;
    }
    startTransition(async () => {
      await updateBudgetItem(item.id, { category: next });
    });
  }

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

  return (
    <tr className={cn(isPending && "opacity-60", rowClass)}>
      <td className="py-2.5 pr-3">
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={saveCategory}
          placeholder="Category"
          aria-label={`Category for ${item.label}`}
          className="w-full min-w-[5rem] bg-transparent text-[14px] text-ink-muted outline-none placeholder:text-ink-muted"
        />
      </td>
      <td className="py-2.5 pr-3">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={saveLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Line item label"
          className="w-full min-w-[8rem] bg-transparent text-[15px] text-ink outline-none"
        />
      </td>
      <td className="py-2.5 pr-3 text-right">
        <input
          type="text"
          inputMode="decimal"
          value={planned}
          onChange={(e) => setPlanned(e.target.value)}
          onBlur={savePlanned}
          aria-label={`Planned amount for ${item.label}`}
          className="w-full min-w-[4.5rem] bg-transparent text-right text-[14px] font-medium tabular-nums text-ink outline-none"
        />
      </td>
      <td className="py-2.5 pr-3 text-right">
        <input
          type="text"
          inputMode="decimal"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          onBlur={saveActual}
          placeholder="—"
          aria-label={`Actual amount for ${item.label}`}
          className="w-full min-w-[4.5rem] bg-transparent text-right text-[14px] tabular-nums text-ink-muted outline-none placeholder:text-ink-muted"
        />
      </td>
      <td className="py-2.5 text-right">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-[13px] text-ink-muted transition-colors hover:text-rosewood disabled:opacity-50"
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
