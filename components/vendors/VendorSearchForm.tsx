"use client";

import { useState, useTransition } from "react";
import {
  searchPlaces,
  type PlaceResult,
} from "@/app/(app)/projects/[projectId]/vendors/search/actions";
import { GoogleMapsAttribution } from "./GoogleMapsAttribution";
import { PlaceResultCard } from "./PlaceResultCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";

export function VendorSearchForm({
  projectId,
  defaultLocation = "",
  initialAddedPlaceIds = [],
}: {
  projectId: string;
  defaultLocation?: string;
  initialAddedPlaceIds?: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchCategory, setSearchCategory] = useState("");
  const [addedPlaceIds, setAddedPlaceIds] = useState(
    () => new Set(initialAddedPlaceIds),
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const category = (form.get("category") as string) ?? "";
    const location = (form.get("location") as string) ?? "";

    startTransition(async () => {
      setError(null);
      setHasSearched(true);
      setSearchCategory(category.trim());

      const response = await searchPlaces(category, location);

      if (!response.ok) {
        setResults(null);
        setError(response.error);
        return;
      }

      setResults(response.places);
    });
  }

  function handleAdded(placeId: string) {
    setAddedPlaceIds((prev) => new Set(prev).add(placeId));
  }

  return (
    <div className="space-y-8">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="category"
                className="text-sm font-medium text-ink"
              >
                Category or keyword
              </label>
              <Input
                id="category"
                name="category"
                type="text"
                required
                placeholder="e.g. wedding florist"
                disabled={isPending}
              />
            </div>

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
                defaultValue={defaultLocation}
                placeholder="e.g. Phoenix AZ"
                disabled={isPending}
              />
            </div>
          </div>

          <Button type="submit" variant="primary" disabled={isPending}>
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
        <section className="space-y-4" aria-live="polite">
          {results && results.length > 0 ? (
            <>
              <p className="text-[13px] text-ink-muted">
                <span className="tabnum">{results.length}</span> result
                {results.length === 1 ? "" : "s"}
              </p>
              <div className="space-y-3">
                {results.map((place) => (
                  <PlaceResultCard
                    key={place.id}
                    projectId={projectId}
                    place={place}
                    category={searchCategory}
                    isAdded={addedPlaceIds.has(place.id)}
                    onAdded={handleAdded}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-ink-muted">
              No vendors found for that search. Try different keywords or a
              nearby location.
            </p>
          )}

          <GoogleMapsAttribution className="pt-2" />
        </section>
      ) : null}
    </div>
  );
}
