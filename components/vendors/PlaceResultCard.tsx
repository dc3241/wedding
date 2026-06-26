"use client";

import { useState, useTransition } from "react";
import {
  addDiscoveredVendor,
  type DiscoveredPlace,
} from "@/app/(app)/projects/[projectId]/vendors/actions";
import type { PlaceResult } from "@/app/(app)/projects/[projectId]/vendors/search/actions";
import { GooglePlaceRating } from "@/components/vendors/GooglePlaceRating";
import { VendorListRow } from "@/components/vendors/VendorListRow";
import { formatPriceLevel } from "@/components/vendors/format-price-level";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

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
  const hasRating = place.rating !== undefined;

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
        category,
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onAdded(place.id);
    });
  }

  return (
    <Card className="overflow-hidden">
      <VendorListRow
        name={place.displayName}
        category={place.formattedAddress ?? category}
        meta={
          <div className="mt-1 space-y-1">
            {hasRating ? (
              <GooglePlaceRating
                rating={place.rating!}
                userRatingCount={place.userRatingCount}
              />
            ) : null}
            {priceLabel ? <span>{priceLabel}</span> : null}
            {place.websiteUri ? (
              <a
                href={place.websiteUri}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-plum hover:text-plum-deep"
              >
                Website
              </a>
            ) : null}
          </div>
        }
        trailing={
          isAdded ? (
            <Pill variant="sage">Added</Pill>
          ) : (
            <Button
              type="button"
              onClick={handleAdd}
              disabled={isPending}
              variant="primary"
            >
              {isPending ? "Adding…" : "Add to list"}
            </Button>
          )
        }
      />
      {error ? (
        <p className="border-t border-stone px-5 py-3 text-sm text-rosewood">
          {error}
        </p>
      ) : null}
    </Card>
  );
}
