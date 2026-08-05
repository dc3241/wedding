"use client";

import { useState, useTransition } from "react";
import {
  addDiscoveredVendor,
  type DiscoveredPlace,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import type { PlaceResult } from "@/app/(app)/projects/[projectId]/vendors/search/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  formatPriceLevel,
  googleMapsPlaceUrl,
  placePhotoSrc,
  placeTypeChips,
  websiteHost,
} from "./place-result-utils";

function StarRow({ rating }: { rating: number }) {
  const filled = Math.round(Math.min(5, Math.max(0, rating)));
  return (
    <span className="inline-flex gap-px" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "text-[13px] leading-none",
            i < filled ? "text-clay" : "text-hairline",
          )}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function PhotoTile({
  photoName,
  isAdded,
}: {
  photoName?: string;
  isAdded: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photoName) && !failed;

  return (
    <div className="relative min-h-[160px] bg-well sm:min-h-[186px]">
      {showPhoto ? (
        // Native lazy-load so Place Photo requests fire on scroll, not all at once.
        // eslint-disable-next-line @next/next/no-img-element -- proxied Places photo URL
        <img
          src={placePhotoSrc(photoName!)}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center text-muted"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="size-9 opacity-50"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="8.5" cy="10" r="1.5" />
            <path d="M21 16l-5-5-4 4-2-2-4 4" />
          </svg>
        </div>
      )}

      {isAdded ? (
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-surface px-2.5 py-1 text-[11px] font-semibold text-sage shadow-raised">
          ✓ On your list
        </span>
      ) : null}
    </div>
  );
}

export function PlaceResultCard({
  projectId,
  place,
  categoryId,
  isAdded,
  onOptimisticAdd,
  onAddSettled,
}: {
  projectId: string;
  place: PlaceResult;
  categoryId: string;
  isAdded: boolean;
  /** Call inside the add transition so useOptimistic can flip immediately. */
  onOptimisticAdd: (placeId: string) => void;
  onAddSettled: (placeId: string, ok: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const address = place.formattedAddress?.trim();
  const host = websiteHost(place.websiteUri);
  const chips = placeTypeChips(place.primaryType, place.types);
  const hasRating = place.rating !== undefined;
  const priceLabel = formatPriceLevel(place.priceLevel);
  const nameHref = place.websiteUri?.trim() || googleMapsPlaceUrl(place.id);

  function handleAdd() {
    if (isAdded) return;

    const persistable: DiscoveredPlace = {
      id: place.id,
      displayName: place.displayName,
      websiteUri: place.websiteUri,
    };

    startTransition(async () => {
      setError(null);
      onOptimisticAdd(place.id);

      const result = await addDiscoveredVendor(
        projectId,
        persistable,
        categoryId,
      );

      if (!result.ok) {
        setError(result.error);
        onAddSettled(place.id, false);
        return;
      }

      onAddSettled(place.id, true);
    });
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised",
        "grid grid-cols-1 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]",
      )}
    >
      <PhotoTile photoName={place.photoName} isAdded={isAdded} />

      <div className="flex flex-col px-4 py-4 sm:px-[18px] sm:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <a
              href={nameHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[17px] font-semibold tracking-[-0.01em] text-ink hover:text-accent"
            >
              {place.displayName}
            </a>
            {chips.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-[var(--radius-pill)] bg-well px-2.5 py-0.5 text-[11px] font-semibold text-muted"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {isAdded ? (
            <span className="shrink-0 rounded-[var(--radius-pill)] border-[1.5px] border-sage bg-well px-3.5 py-2 text-[13px] font-semibold text-sage">
              On your list
            </span>
          ) : (
            <Button
              type="button"
              onClick={handleAdd}
              disabled={isPending}
              variant="default"
              className="shrink-0 border-accent px-4 py-2 text-[13px] text-accent hover:bg-accent hover:text-surface"
            >
              {isPending ? "Adding…" : "Add to list"}
            </Button>
          )}
        </div>

        {hasRating || priceLabel ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
            {hasRating ? (
              <>
                <StarRow rating={place.rating!} />
                <span className="tabnum font-bold text-ink">
                  {place.rating!.toFixed(1)}
                </span>
                {place.userRatingCount != null ? (
                  <span className="text-muted">
                    ·{" "}
                    <span className="tabnum">
                      {place.userRatingCount.toLocaleString()}
                    </span>{" "}
                    {place.userRatingCount === 1 ? "review" : "reviews"}
                  </span>
                ) : null}
              </>
            ) : null}
            <span className="font-semibold text-muted">
              {hasRating ? "· " : null}
              {priceLabel}
            </span>
          </div>
        ) : null}

        <div className="mt-2.5 space-y-1">
          {address ? (
            <p className="text-[13px] leading-snug text-muted">{address}</p>
          ) : (
            <p className="text-[13px] text-muted">Travels to your venue</p>
          )}
          {host ? (
            <a
              href={place.websiteUri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[13px] font-medium text-muted hover:text-accent"
            >
              {host}
            </a>
          ) : null}
        </div>

        {error ? (
          <p className="mt-2 text-[13px] text-rosewood">{error}</p>
        ) : null}
      </div>
    </article>
  );
}
