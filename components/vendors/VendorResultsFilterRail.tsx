"use client";

import type { PlaceResult } from "@/app/(app)/projects/[projectId]/vendors/search/actions";
import { Card } from "@/components/ui/card";
import { CollapseSection } from "@/components/ui/collapse-section";
import { cn } from "@/lib/cn";
import { priceLevelToPip, type PricePip } from "./place-result-utils";

export type ResultsSort = "best" | "rating" | "reviews";

export type ResultsFilterState = {
  sort: ResultsSort;
  minRating: number;
  /** Empty = any price. Values are pip levels 1–4. */
  pricePips: Set<PricePip>;
  includeUnpriced: boolean;
  openNow: boolean;
  hasWebsite: boolean;
  notOnList: boolean;
};

export function createDefaultResultsFilters(): ResultsFilterState {
  return {
    sort: "best",
    minRating: 0,
    pricePips: new Set(),
    includeUnpriced: true,
    openNow: false,
    hasWebsite: false,
    notOnList: false,
  };
}

export function filtersAreDefault(filters: ResultsFilterState): boolean {
  return (
    filters.sort === "best" &&
    filters.minRating === 0 &&
    filters.pricePips.size === 0 &&
    filters.includeUnpriced &&
    !filters.openNow &&
    !filters.hasWebsite &&
    !filters.notOnList
  );
}

export function applyResultsFilters(
  results: PlaceResult[],
  filters: ResultsFilterState,
  addedPlaceIds: Set<string>,
): PlaceResult[] {
  let next = results.filter((place) => {
    if (filters.minRating > 0) {
      if (place.rating == null || place.rating < filters.minRating) return false;
    }

    if (filters.pricePips.size > 0) {
      const pip = priceLevelToPip(place.priceLevel);
      if (pip == null) {
        if (!filters.includeUnpriced) return false;
      } else if (!filters.pricePips.has(pip)) {
        return false;
      }
    } else if (!filters.includeUnpriced) {
      if (priceLevelToPip(place.priceLevel) == null) return false;
    }

    if (filters.openNow && place.openNow !== true) return false;
    if (filters.hasWebsite && !place.websiteUri?.trim()) return false;
    if (filters.notOnList && addedPlaceIds.has(place.id)) return false;

    return true;
  });

  if (filters.sort === "rating") {
    next = [...next].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (filters.sort === "reviews") {
    next = [...next].sort(
      (a, b) => (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0),
    );
  }

  return next;
}

function ToggleRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 text-[13px] text-muted hover:text-ink"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={cn(
          "relative h-[22px] w-[38px] shrink-0 rounded-[var(--radius-pill)] border transition-colors",
          on ? "border-sage bg-sage" : "border-ring bg-well",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-raised transition-transform",
            on && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}

const PRICE_PIPS: PricePip[] = [1, 2, 3, 4];

export function VendorResultsFilterRail({
  resultCount,
  filters,
  onChange,
  onClear,
}: {
  resultCount: number;
  filters: ResultsFilterState;
  onChange: (next: ResultsFilterState) => void;
  onClear: () => void;
}) {
  const showClear = !filtersAreDefault(filters);

  function togglePip(pip: PricePip) {
    const next = new Set(filters.pricePips);
    if (next.has(pip)) next.delete(pip);
    else next.add(pip);
    onChange({ ...filters, pricePips: next });
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-hairline px-[18px] py-3.5">
        <h3 className="text-[15px] font-semibold text-ink">Refine</h3>
        <p className="mt-0.5 text-[12px] leading-snug text-muted">
          Filters these{" "}
          <span className="tabnum font-medium text-ink">{resultCount}</span>{" "}
          results — they don&apos;t re-run the search.
        </p>
      </div>

      <CollapseSection
        title={
          <span className="text-[13px] font-semibold text-ink">Sort</span>
        }
        headerClassName="px-[18px] py-3"
        bodyClassName="flex flex-col gap-2 px-[18px] pb-3.5"
        defaultOpen
      >
        {(
          [
            ["best", "Best match"],
            ["rating", "Highest rated"],
            ["reviews", "Most reviewed"],
          ] as const
        ).map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted hover:text-ink"
          >
            <input
              type="radio"
              name="vendor-results-sort"
              value={value}
              checked={filters.sort === value}
              onChange={() => onChange({ ...filters, sort: value })}
              className="size-[15px] accent-[var(--accent)]"
            />
            {label}
          </label>
        ))}
      </CollapseSection>

      <div className="border-t border-hairline">
        <CollapseSection
          title={
            <span className="text-[13px] font-semibold text-ink">Rating</span>
          }
          headerClassName="px-[18px] py-3"
          bodyClassName="flex flex-col gap-2 px-[18px] pb-3.5"
          defaultOpen
        >
          {(
            [
              [4.5, "4.5 & up"],
              [4, "4.0 & up"],
              [0, "Any rating"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted hover:text-ink"
            >
              <input
                type="radio"
                name="vendor-results-rating"
                value={value}
                checked={filters.minRating === value}
                onChange={() => onChange({ ...filters, minRating: value })}
                className="size-[15px] accent-[var(--accent)]"
              />
              {label}
            </label>
          ))}
        </CollapseSection>
      </div>

      <div className="border-t border-hairline">
        <CollapseSection
          title={
            <span className="text-[13px] font-semibold text-ink">Price</span>
          }
          headerClassName="px-[18px] py-3"
          bodyClassName="flex flex-col gap-2.5 px-[18px] pb-3.5"
          defaultOpen
        >
          <div className="flex gap-1.5">
            {PRICE_PIPS.map((pip) => {
              const on = filters.pricePips.has(pip);
              return (
                <button
                  key={pip}
                  type="button"
                  aria-pressed={on}
                  onClick={() => togglePip(pip)}
                  className={cn(
                    "flex-1 rounded-[var(--radius-inner)] border py-1.5 text-center text-[13px] font-semibold transition-colors",
                    on
                      ? "border-accent bg-accent-wash text-accent"
                      : "border-ring bg-well text-muted hover:text-ink",
                  )}
                >
                  {"$".repeat(pip)}
                </button>
              );
            })}
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-muted hover:text-ink">
            <input
              type="checkbox"
              checked={filters.includeUnpriced}
              onChange={(e) =>
                onChange({ ...filters, includeUnpriced: e.target.checked })
              }
              className="size-[15px] accent-[var(--accent)]"
            />
            Include unpriced
          </label>
        </CollapseSection>
      </div>

      <div className="border-t border-hairline">
        <CollapseSection
          title={
            <span className="text-[13px] font-semibold text-ink">Details</span>
          }
          headerClassName="px-[18px] py-3"
          bodyClassName="flex flex-col gap-2.5 px-[18px] pb-3.5"
          defaultOpen
        >
          <ToggleRow
            label="Open now"
            on={filters.openNow}
            onToggle={() =>
              onChange({ ...filters, openNow: !filters.openNow })
            }
          />
          <ToggleRow
            label="Has website"
            on={filters.hasWebsite}
            onToggle={() =>
              onChange({ ...filters, hasWebsite: !filters.hasWebsite })
            }
          />
          <ToggleRow
            label="Not yet on your list"
            on={filters.notOnList}
            onToggle={() =>
              onChange({ ...filters, notOnList: !filters.notOnList })
            }
          />
        </CollapseSection>
      </div>

      {showClear ? (
        <button
          type="button"
          onClick={onClear}
          className="w-full border-t border-hairline px-3 py-3 text-[13px] font-semibold text-muted hover:text-accent"
        >
          Clear all
        </button>
      ) : null}
    </Card>
  );
}
