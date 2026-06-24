"use client";

import { useState, useTransition } from "react";
import {
  addDiscoveredVendor,
  type DiscoveredPlace,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import type { PlaceResult } from "@/app/(app)/projects/[projectId]/vendors/search/actions";
import { formatPriceLevel } from "./format-price-level";

export function PlaceResultCard({
  projectId,
  place,
  category,
  isAdded,
  onAdded,
}: {
  projectId: string;
  place: PlaceResult;
  category: string;
  isAdded: boolean;
  onAdded: (placeId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const priceLabel = formatPriceLevel(place.priceLevel);
  const hasRating =
    place.rating !== undefined && place.userRatingCount !== undefined;

  function handleAdd() {
    const persistable: DiscoveredPlace = {
      id: place.id,
      displayName: place.displayName,
      websiteUri: place.websiteUri,
    };

    startTransition(async () => {
      setError(null);
      const result = await addDiscoveredVendor(
        projectId,
        persistable,
        category
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onAdded(place.id);
    });
  }

  return (
    <article className="rounded-md border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-zinc-900">{place.displayName}</h3>

          {place.formattedAddress ? (
            <p className="mt-1 text-sm text-zinc-600">
              {place.formattedAddress}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
            {hasRating ? (
              <span>
                {place.rating!.toFixed(1)} ★ (
                {place.userRatingCount!.toLocaleString()}{" "}
                {place.userRatingCount === 1 ? "review" : "reviews"})
              </span>
            ) : place.rating !== undefined ? (
              <span>{place.rating.toFixed(1)} ★</span>
            ) : null}

            {priceLabel ? <span>{priceLabel}</span> : null}
          </div>

          {place.websiteUri ? (
            <a
              href={place.websiteUri}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-zinc-700 underline hover:text-zinc-900"
            >
              Website
            </a>
          ) : null}
        </div>

        {isAdded ? (
          <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
            Added
          </span>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending}
            className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {isPending ? "Adding…" : "Add to list"}
          </button>
        )}
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : null}
    </article>
  );
}
