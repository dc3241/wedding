"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  searchPlaces,
  type PlaceResult,
} from "@/app/(app)/projects/[projectId]/vendors/search/actions";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";
import { PlaceResultCard } from "./PlaceResultCard";
import { useVendorSearchCache } from "./VendorSearchCacheProvider";
import {
  VendorSearchRail,
  type NeededVendorTarget,
} from "./VendorSearchRail";
import {
  applyResultsFilters,
  createDefaultResultsFilters,
  VendorResultsFilterRail,
  type ResultsFilterState,
} from "./VendorResultsFilterRail";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";

export function VendorSearchForm({
  projectId,
  defaultLocation = "",
  initialAddedPlaceIds = [],
  neededTargets = [],
  initialOnListByCategoryId = {},
}: {
  projectId: string;
  defaultLocation?: string;
  initialAddedPlaceIds?: string[];
  neededTargets?: NeededVendorTarget[];
  initialOnListByCategoryId?: Record<string, number>;
}) {
  const searchCache = useVendorSearchCache();
  const cached = searchCache.get(projectId);

  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<PlaceResult[] | null>(
    () => cached?.results ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(() => Boolean(cached));
  const [categoryId, setCategoryId] = useState(
    () => cached?.params.categoryId ?? "",
  );
  const [location, setLocation] = useState(
    () => cached?.params.location ?? defaultLocation,
  );
  const [refinement, setRefinement] = useState(
    () => cached?.params.refinement ?? "",
  );
  const [composedQuery, setComposedQuery] = useState<string | null>(
    () => cached?.composedQuery ?? null,
  );
  const [filteredCount, setFilteredCount] = useState(
    () => cached?.filteredCount ?? 0,
  );
  // Fresh every mount from the server page — never from the search cache.
  const [addedPlaceIds, setAddedPlaceIds] = useState(
    () => new Set(initialAddedPlaceIds),
  );
  const [optimisticAdded, addOptimistic] = useOptimistic(
    addedPlaceIds,
    (current, placeId: string) => new Set(current).add(placeId),
  );
  const [onListByCategoryId, setOnListByCategoryId] = useState(
    () => ({ ...initialOnListByCategoryId }),
  );
  const [filters, setFilters] = useState<ResultsFilterState>(
    createDefaultResultsFilters,
  );

  function runSearch(nextCategoryId: string) {
    if (!nextCategoryId) {
      setError("Choose a vendor category.");
      return;
    }

    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      setError("Enter a location to search near.");
      return;
    }

    startTransition(async () => {
      setError(null);
      setHasSearched(true);
      setFilters(createDefaultResultsFilters());

      const response = await searchPlaces(
        projectId,
        nextCategoryId,
        trimmedLocation,
        refinement,
      );

      if (!response.ok) {
        setResults(null);
        setComposedQuery(null);
        setFilteredCount(0);
        setError(response.error);
        return;
      }

      setResults(response.results);
      setComposedQuery(response.composedQuery);
      setFilteredCount(response.filteredCount);
      searchCache.set(projectId, {
        params: {
          categoryId: nextCategoryId,
          location: trimmedLocation,
          refinement: refinement.trim(),
        },
        results: response.results,
        composedQuery: response.composedQuery,
        filteredCount: response.filteredCount,
      });
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    runSearch(categoryId);
  }

  function handleRailCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    runSearch(nextCategoryId);
  }

  function handleOptimisticAdd(placeId: string) {
    addOptimistic(placeId);
  }

  function handleAddSettled(placeId: string, ok: boolean) {
    if (!ok) return;
    setAddedPlaceIds((prev) => new Set(prev).add(placeId));
    if (!categoryId) return;
    setOnListByCategoryId((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] ?? 0) + 1,
    }));
  }

  const onListCount = categoryId ? (onListByCategoryId[categoryId] ?? 0) : 0;
  const hasResults = Boolean(results && results.length > 0);
  const visibleResults =
    results && results.length > 0
      ? applyResultsFilters(results, filters, optimisticAdded)
      : [];

  const filterSlot = hasResults ? (
    <VendorResultsFilterRail
      resultCount={results!.length}
      filters={filters}
      onChange={setFilters}
      onClear={() => setFilters(createDefaultResultsFilters())}
    />
  ) : null;

  const showRail =
    Boolean(filterSlot) ||
    neededTargets.length > 0 ||
    (onListCount > 0 && Boolean(categoryId));

  const searchCard = (
    <Card data-tour="vendors-search" className="px-6 py-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Eyebrow>Discover</Eyebrow>
          <h2 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Search vendors
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Live results from Google Places — ratings and reviews load on the
            vendor detail page after you add them.
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-[14px] font-medium text-ink">Category</legend>
          <div className="flex flex-wrap gap-2">
            {VENDOR_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                disabled={isPending}
                aria-pressed={categoryId === cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={
                  categoryId === cat.id
                    ? "rounded-[var(--radius-pill)] bg-accent px-3.5 py-2 text-[13px] font-semibold text-surface"
                    : "rounded-[var(--radius-pill)] bg-well px-3.5 py-2 text-[13px] font-semibold text-muted hover:text-ink"
                }
              >
                {cat.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="location" className="text-sm font-medium text-ink">
              Location
            </label>
            <Input
              id="location"
              name="location"
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Scottsdale, AZ"
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="refinement"
              className="text-sm font-medium text-ink"
            >
              Refinement (optional)
            </label>
            <Input
              id="refinement"
              name="refinement"
              type="text"
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              placeholder="e.g. outdoor, bilingual"
              disabled={isPending}
            />
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isPending || !categoryId}
        >
          {isPending ? "Searching…" : "Search"}
        </Button>
      </form>
    </Card>
  );

  const resultsSection =
    hasSearched && !error && !isPending ? (
      <section className="space-y-2.5" aria-live="polite">
        {hasResults ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-[13px]">
                <span className="tabnum font-medium text-ink">
                  {visibleResults.length}
                </span>{" "}
                <span className="text-muted">
                  {visibleResults.length === 1 ? "result" : "results"}
                  {visibleResults.length !== results!.length ? (
                    <>
                      {" "}
                      of{" "}
                      <span className="tabnum font-medium text-ink">
                        {results!.length}
                      </span>
                    </>
                  ) : null}{" "}
                  for
                </span>{" "}
                <span className="font-medium text-ink">{composedQuery}</span>
              </p>
              {filteredCount > 0 ? (
                <p className="shrink-0 text-[13px] text-muted">
                  <span className="tabnum">{filteredCount}</span> filtered out
                </p>
              ) : null}
            </div>

            {visibleResults.length > 0 ? (
              <div className="space-y-3.5">
                {visibleResults.map((place) => (
                  <PlaceResultCard
                    key={place.id}
                    projectId={projectId}
                    place={place}
                    categoryId={categoryId}
                    isAdded={optimisticAdded.has(place.id)}
                    onOptimisticAdd={handleOptimisticAdd}
                    onAddSettled={handleAddSettled}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[15px] font-medium text-ink">
                  No matches for these filters
                </p>
                <p className="text-[13px] text-muted">
                  Clear filters to see all{" "}
                  <span className="tabnum">{results!.length}</span> results
                  again.
                </p>
              </div>
            )}

            <p className="pt-1 text-[11px] text-muted">
              Ratings and listings from{" "}
              <span translate="no">Google Maps</span>
            </p>
          </>
        ) : (
          <div className="space-y-1">
            <p className="text-[15px] font-medium text-ink">
              Nothing in this search yet
            </p>
            <p className="text-[13px] text-muted">
              Try another category or a nearby location — matches will show up
              here.
              {filteredCount > 0 ? (
                <>
                  {" "}
                  (<span className="tabnum">{filteredCount}</span> filtered out)
                </>
              ) : null}
            </p>
          </div>
        )}
      </section>
    ) : null;

  const main = (
    <div id="discover" className="min-w-0 scroll-mt-6 space-y-6">
      {searchCard}
      {error ? (
        <p className="rounded-[var(--radius-inner)] bg-rosewood-wash px-4 py-3 text-[14px] font-medium text-rosewood">
          {error}
        </p>
      ) : null}
      {resultsSection}
    </div>
  );

  const contextRail = (
    <VendorSearchRail
      projectId={projectId}
      neededTargets={neededTargets}
      activeCategoryId={categoryId}
      onListCount={onListCount}
      disabled={isPending}
      onSelectCategory={handleRailCategory}
      filterSlot={filterSlot}
    />
  );

  // Photo-led results: filter/still-needed rail on the left (mockup hierarchy).
  if (hasResults) {
    return (
      <div className="space-y-6">
        {searchCard}
        {error ? (
          <p className="rounded-[var(--radius-inner)] bg-rosewood-wash px-4 py-3 text-[14px] font-medium text-rosewood">
            {error}
          </p>
        ) : null}
        <div
          id="discover"
          className="grid scroll-mt-6 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] lg:gap-8"
        >
          {contextRail}
          <div className="min-w-0">{resultsSection}</div>
        </div>
      </div>
    );
  }

  // Pre-results: keep the sanctioned main + sticky context rail split.
  if (showRail) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
        {main}
        {contextRail}
      </div>
    );
  }

  return main;
}
