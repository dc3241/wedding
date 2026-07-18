"use client";

import { useState, useTransition } from "react";
import {
  addDiscoveredVendor,
  type DiscoveredPlace,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import type { PlaceResult } from "@/app/(app)/projects/[projectId]/vendors/search/actions";
import { Button } from "@/components/ui/button";

function humanizePrimaryType(type: string): string {
  return type
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function websiteHost(uri?: string): string | null {
  if (!uri?.trim()) return null;
  try {
    const host = new URL(uri).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

export function PlaceResultCard({
  projectId,
  place,
  categoryId,
  isAdded,
  onAdded,
}: {
  projectId: string;
  place: PlaceResult;
  categoryId: string;
  isAdded: boolean;
  onAdded: (placeId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const address = place.formattedAddress?.trim();
  const host = websiteHost(place.websiteUri);
  const typeLabel = place.primaryType
    ? humanizePrimaryType(place.primaryType)
    : null;
  const hasRating = place.rating !== undefined;

  function handleAdd() {
    if (isAdded) return;

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
        categoryId,
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onAdded(place.id);
    });
  }

  return (
    <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate text-[15px] font-medium text-ink">
              {place.displayName}
            </span>
            {typeLabel ? (
              <span className="shrink-0 rounded-[var(--radius-pill)] bg-surface px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.03em] text-muted">
                {typeLabel}
              </span>
            ) : null}
          </div>

          {hasRating ? (
            <p className="mt-0.5 truncate text-[13px]">
              <span className="tabnum font-medium text-ink">
                {place.rating!.toFixed(1)}
              </span>
              {place.userRatingCount != null ? (
                <span className="text-muted">
                  {" "}
                  ·{" "}
                  <span className="tabnum">
                    {place.userRatingCount.toLocaleString()}
                  </span>{" "}
                  {place.userRatingCount === 1 ? "review" : "reviews"}
                </span>
              ) : null}
            </p>
          ) : null}

          <p className="mt-0.5 truncate text-[13px] text-muted">
            {address ? address : "Travels to your venue"}
            {host ? (
              <>
                {" "}
                ·{" "}
                <a
                  href={place.websiteUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-ink"
                >
                  {host}
                </a>
              </>
            ) : null}
          </p>
        </div>

        <div className="shrink-0">
          {isAdded ? (
            <span className="text-[13px] font-medium text-sage">
              On your list
            </span>
          ) : (
            <Button
              type="button"
              onClick={handleAdd}
              disabled={isPending}
              variant="secondary"
              className="border-[0.5px] bg-transparent px-3 py-1.5 text-[13px]"
            >
              {isPending ? "Adding…" : "Add to list"}
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-[13px] text-rosewood">{error}</p>
      ) : null}
    </div>
  );
}
