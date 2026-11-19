"use client";

import { cn } from "@/lib/cn";
import {
  COST_STYLES,
  estimateWeddingCost,
  formatUsd,
  type CostStyleId,
} from "@/lib/plan/wedding-cost";
import { useMemo, useState } from "react";

const fieldClass =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink placeholder:text-muted";

export function WeddingCostCalculator() {
  const [guests, setGuests] = useState(100);
  const [style, setStyle] = useState<CostStyleId>("classic");
  const [budgetRaw, setBudgetRaw] = useState("");

  const budget = budgetRaw ? Number(budgetRaw.replace(/[^0-9.]/g, "")) : null;
  const est = useMemo(
    () => estimateWeddingCost(guests, style, budget && budget > 0 ? budget : null),
    [guests, style, budget],
  );
  const max = Math.max(...est.split.map((s) => s.pct));

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised">
        <label className="block text-[14px] font-semibold text-ink" htmlFor="cost-guests">
          Guest count <span className="ml-1 text-muted">{guests}</span>
        </label>
        <input
          id="cost-guests"
          type="range"
          min={10}
          max={400}
          step={5}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--accent)]"
        />

        <fieldset className="mt-6">
          <legend className="text-[14px] font-semibold text-ink">Style</legend>
          <div className="mt-3 grid gap-2">
            {COST_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                aria-pressed={style === s.id}
                className={cn(
                  "rounded-[var(--radius-inner)] border px-4 py-3 text-left transition-colors",
                  style === s.id
                    ? "border-accent bg-accent-wash"
                    : "border-hairline bg-surface hover:border-accent",
                )}
              >
                <span className="block text-[14.5px] font-bold text-ink">{s.label}</span>
                <span className="block text-[13px] text-muted">{s.note}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-6 block text-[14px] font-semibold text-ink" htmlFor="cost-budget">
          Already have a budget? <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="cost-budget"
          inputMode="numeric"
          placeholder="e.g. 30000"
          value={budgetRaw}
          onChange={(e) => setBudgetRaw(e.target.value)}
          className={cn(fieldClass, "mt-2")}
        />
      </div>

      <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised" aria-live="polite">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
          Estimated total
        </p>
        <p className="mt-1 text-[32px] font-extrabold tracking-[-0.02em] text-ink">
          {formatUsd(est.low)} – {formatUsd(est.high)}
        </p>
        {est.perGuestAtBudget != null ? (
          <p className="mt-1 text-[14px] text-muted">
            Your budget works out to <strong className="text-ink">{formatUsd(est.perGuestAtBudget)}</strong>{" "}
            per guest.
          </p>
        ) : null}

        <h2 className="mt-6 text-[15px] font-bold text-ink">
          How {est.basisIsBudget ? "your budget" : `about ${formatUsd(est.basis)}`} usually splits
        </h2>
        <ul className="mt-3 space-y-2">
          {est.split.map((row) => (
            <li key={row.label} className="rounded-[var(--radius-inner)] bg-well px-3.5 py-2.5 shadow-recessed">
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="font-medium text-ink">{row.label}</span>
                <span className="shrink-0 font-semibold text-ink">
                  {formatUsd(row.amount)} <span className="font-normal text-muted">· {row.pct}%</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-surface">
                <div
                  className="h-1.5 rounded-full bg-accent"
                  style={{ width: `${(row.pct / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
          A starting point, not a quote. These are planning rules of thumb, and prices in your area
          can run well above or below them. Get real numbers from two or three vendors per category.
        </p>
      </div>
    </div>
  );
}
