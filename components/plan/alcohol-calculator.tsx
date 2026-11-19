"use client";

import { cn } from "@/lib/cn";
import {
  BAR_TYPES,
  DRINKER_LEVELS,
  estimateAlcohol,
  type BarTypeId,
  type DrinkerLevelId,
} from "@/lib/plan/alcohol";
import { useMemo, useState } from "react";

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="mt-6">
      <legend className="text-[14px] font-semibold text-ink">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "rounded-[var(--radius-pill)] border px-4 py-2 text-[14px] font-semibold transition-colors",
              value === o.id
                ? "border-accent bg-accent-wash text-accent"
                : "border-hairline bg-surface text-ink hover:border-accent",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Stat({ value, label, sub }: { value: number; label: string; sub?: string }) {
  return (
    <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
      <p className="text-[26px] font-extrabold tracking-[-0.02em] text-ink">{value.toLocaleString()}</p>
      <p className="text-[14px] font-semibold text-ink">{label}</p>
      {sub ? <p className="text-[12.5px] text-muted">{sub}</p> : null}
    </div>
  );
}

export function AlcoholCalculator() {
  const [guests, setGuests] = useState(100);
  const [hours, setHours] = useState(5);
  const [bar, setBar] = useState<BarTypeId>("full");
  const [level, setLevel] = useState<DrinkerLevelId>("average");
  const [toast, setToast] = useState(true);

  const est = useMemo(
    () => estimateAlcohol({ drinkingGuests: guests, hours, bar, level, toast }),
    [guests, hours, bar, level, toast],
  );

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised">
        <label className="block text-[14px] font-semibold text-ink" htmlFor="alc-guests">
          Guests who drink <span className="ml-1 text-muted">{guests}</span>
        </label>
        <input
          id="alc-guests"
          type="range"
          min={10}
          max={400}
          step={5}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--accent)]"
        />
        <label className="mt-6 block text-[14px] font-semibold text-ink" htmlFor="alc-hours">
          Hours of drinking <span className="ml-1 text-muted">{hours}</span>
        </label>
        <input
          id="alc-hours"
          type="range"
          min={1}
          max={8}
          step={1}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="mt-3 w-full accent-[var(--accent)]"
        />
        <Choice label="Bar" options={BAR_TYPES} value={bar} onChange={setBar} />
        <Choice label="Your crowd" options={DRINKER_LEVELS} value={level} onChange={setLevel} />
        <label className="mt-6 flex items-center gap-3 text-[14px] font-semibold text-ink">
          <input
            type="checkbox"
            checked={toast}
            onChange={(e) => setToast(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Champagne toast for everyone
        </label>
      </div>

      <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised" aria-live="polite">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">What to buy</p>
        <p className="mt-1 text-[15px] text-muted">
          About <strong className="text-ink">{est.totalDrinks.toLocaleString()} drinks</strong> over the night.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {est.wineBottles > 0 ? (
            <Stat value={est.wineBottles} label="Bottles of wine" sub={`About ${est.wineCases} cases of 12`} />
          ) : null}
          {est.beers > 0 ? (
            <Stat value={est.beers} label="Beers" sub={`About ${est.beerCases} cases of 24`} />
          ) : null}
          {est.liquorBottles > 0 ? (
            <Stat value={est.liquorBottles} label="Bottles of liquor" sub="750 ml each" />
          ) : null}
          {est.sparklingBottles > 0 ? (
            <Stat value={est.sparklingBottles} label="Bottles of sparkling" sub="For the toast" />
          ) : null}
        </div>
        <p className="mt-5 text-[12.5px] leading-relaxed text-muted">
          Based on two drinks per guest in the first hour and one an hour after, 5 glasses per bottle
          of wine and 16 shots per bottle of liquor. Many stores take back unopened bottles, so ask
          before you buy and round up rather than down.
        </p>
      </div>
    </div>
  );
}
