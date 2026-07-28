"use server";

import {
  composeVendorTextQuery,
  getVendorCategoryById,
} from "@/lib/vendor-categories";
import { placesTextSearch } from "@/lib/places-text-search";
import { createClient } from "@/utils/supabase/server";

export type PlaceResult = {
  id: string;
  displayName: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  primaryType?: string;
  types?: string[];
};

export type SearchPlacesResponse =
  | {
      ok: true;
      results: PlaceResult[];
      filteredCount: number;
      composedQuery: string;
    }
  | { ok: false; error: string };

export async function searchPlaces(
  projectId: string,
  categoryId: string,
  location: string,
  refinement = "",
): Promise<SearchPlacesResponse> {
  const trimmedLocation = location.trim();
  if (!trimmedLocation) {
    return { ok: false, error: "Enter a location to search near." };
  }

  const category = getVendorCategoryById(categoryId.trim());
  if (!category) {
    return { ok: false, error: "Choose a valid vendor category." };
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) {
    return { ok: false, error: "Project not found." };
  }

  const textQuery = composeVendorTextQuery(category, trimmedLocation, refinement);

  const requestBody: Record<string, unknown> = {
    textQuery,
    maxResultCount: 20,
    includePureServiceAreaBusinesses: true,
  };

  if (category.includedType) {
    requestBody.includedType = category.includedType;
    requestBody.strictTypeFiltering = true;
  }

  console.log("[searchPlaces] places:searchText body", requestBody);

  const search = await placesTextSearch({
    textQuery,
    maxResultCount: 20,
    includePureServiceAreaBusinesses: true,
    ...(category.includedType
      ? {
          includedType: category.includedType,
          strictTypeFiltering: true,
        }
      : {}),
  });

  if (!search.ok) {
    return { ok: false, error: search.error };
  }

  const mapped: PlaceResult[] = search.places.map((place) => ({
    id: place.id,
    displayName: place.name,
    formattedAddress: place.formattedAddress,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    websiteUri: place.websiteUri,
    primaryType: place.primaryType,
    types: place.types,
  }));

  let results = mapped;
  let filteredCount = 0;

  if (category.includedType === null && category.deniedPrimaryTypes.length > 0) {
    const denied = new Set(category.deniedPrimaryTypes);
    results = mapped.filter(
      (place) => !place.primaryType || !denied.has(place.primaryType),
    );
    filteredCount = mapped.length - results.length;
  }

  return {
    ok: true,
    results,
    filteredCount,
    composedQuery: textQuery,
  };
}
