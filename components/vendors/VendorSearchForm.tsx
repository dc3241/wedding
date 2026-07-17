"use client";

import { useState, useTransition } from "react";
import {
  searchPlaces,
  type PlaceResult,
} from "@/app/(app)/projects/[projectId]/vendors/search/actions";
import { VENDOR_CATEGORIES } from "@/lib/vendor-categories";
import { PlaceResultCard } from "./PlaceResultCard";
import {
  VendorSearchRail,
  type NeededVendorTarget,
} from "./VendorSearchRail";
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
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [location, setLocation] = useState(defaultLocation);
  const [refinement, setRefinement] = useState("");
  const [composedQuery, setComposedQuery] = useState<string | null>(null);
  const [filteredCount, setFilteredCount] = useState(0);
  const [addedPlaceIds, setAddedPlaceIds] = useState(
    () => new Set(initialAddedPlaceIds),
  );
  const [onListByCategoryId, setOnListByCategoryId] = useState(
    () => ({ ...initialOnListByCategoryId }),
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

  function handleAdded(placeId: string) {
    setAddedPlaceIds((prev) => new Set(prev).add(placeId));
    if (!categoryId) return;
    setOnListByCategoryId((prev) => ({
      ...prev,
      [categoryId]: (prev[categoryId] ?? 0) + 1,
    }));
  }

  const onListCount = categoryId ? (onListByCategoryId[categoryId] ?? 0) : 0;
  const showRail =
    neededTargets.length > 0 || (onListCount > 0 && Boolean(categoryId));

  const main = (
    <div className="min-w-0 space-y-8">
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Eyebrow>Discover</Eyebrow>
            <h2 className="font-display mt-1.5 text-2xl text-ink">
              Search vendors
            </h2>
            <p className="mt-1 text-[13px] text-ink-muted">
              Live results from Google Places — ratings and reviews load on the
              vendor detail page after you add them.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Category</legend>
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
                      ? "rounded border border-plum bg-plum-tint px-3 py-1.5 text-[13px] text-plum-deep"
                      : "rounded border border-stone bg-surface px-3 py-1.5 text-[13px] text-ink"
                  }
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="location"
                className="text-sm font-medium text-ink"
              >
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

      {error ? (
        <p className="rounded-lg border border-stone bg-surface px-4 py-3 text-sm text-rosewood">
          {error}
        </p>
      ) : null}

      {hasSearched && !error && !isPending ? (
        <section className="max-w-[600px] space-y-2" aria-live="polite">
          {results && results.length > 0 ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-[13px]">
                  <span className="tabnum font-medium text-ink">
                    {results.length}
                  </span>{" "}
                  <span className="text-ink-muted">
                    {results.length === 1 ? "result" : "results"} for
                  </span>{" "}
                  <span className="font-medium text-ink">{composedQuery}</span>
                </p>
                {filteredCount > 0 ? (
                  <p className="shrink-0 text-[13px] text-ink-muted">
                    <span className="tabnum">{filteredCount}</span> filtered out
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                {results.map((place) => (
                  <PlaceResultCard
                    key={place.id}
                    projectId={projectId}
                    place={place}
                    categoryId={categoryId}
                    isAdded={addedPlaceIds.has(place.id)}
                    onAdded={handleAdded}
                  />
                ))}
              </div>

              <p className="pt-1 text-[11px] text-ink-muted">
                Ratings and listings from{" "}
                <span translate="no">Google Maps</span>
              </p>
            </>
          ) : (
            <div className="space-y-1">
              <p className="text-[15px] font-medium text-ink">
                Nothing in this search yet
              </p>
              <p className="text-[13px] text-ink-muted">
                Try another category or a nearby location — matches will show up
                here.
                {filteredCount > 0 ? (
                  <>
                    {" "}
                    (<span className="tabnum">{filteredCount}</span> filtered
                    out)
                  </>
                ) : null}
              </p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );

  if (!showRail) {
    return <div className="space-y-8">{main}</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:gap-8">
      {main}
      <VendorSearchRail
        projectId={projectId}
        neededTargets={neededTargets}
        activeCategoryId={categoryId}
        onListCount={onListCount}
        disabled={isPending}
        onSelectCategory={handleRailCategory}
      />
    </div>
  );
}
