"use client";

import { useState, useTransition } from "react";
import {
  searchPlaces,
  type PlaceResult,
} from "@/app/(app)/projects/[projectId]/vendors/search/actions";
import { GoogleMapsAttribution } from "./GoogleMapsAttribution";
import { PlaceResultCard } from "./PlaceResultCard";

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
    () => new Set(initialAddedPlaceIds)
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
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-md border border-zinc-200 p-4"
      >
        <h2 className="text-sm font-medium">Search vendors</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="category"
              className="text-xs font-medium text-zinc-600"
            >
              Category or keyword
            </label>
            <input
              id="category"
              name="category"
              type="text"
              required
              placeholder="e.g. wedding florist"
              disabled={isPending}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="location"
              className="text-xs font-medium text-zinc-600"
            >
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              defaultValue={defaultLocation}
              placeholder="e.g. Phoenix AZ"
              disabled={isPending}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-50"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {hasSearched && !error && !isPending ? (
        <section className="space-y-4" aria-live="polite">
          {results && results.length > 0 ? (
            <>
              <p className="text-sm text-zinc-500">
                {results.length} result{results.length === 1 ? "" : "s"}
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
            <p className="text-sm text-zinc-500">
              No vendors found for that search. Try different keywords or a
              nearby location.
            </p>
          )}

          <GoogleMapsAttribution />
        </section>
      ) : null}
    </div>
  );
}
