"use server";

import {
  composeVendorTextQuery,
  getVendorCategoryById,
} from "@/lib/vendor-categories";
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

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  primaryType?: string;
  types?: string[];
};

type GoogleSearchResponse = {
  places?: GooglePlace[];
  error?: { message?: string; status?: string };
};

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

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "Places search is not configured. Missing GOOGLE_MAPS_API_KEY.",
    };
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

  let response: Response;
  try {
    response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.primaryType,places.types",
        },
        body: JSON.stringify(requestBody),
      },
    );
  } catch {
    return {
      ok: false,
      error: "Could not reach Google Places. Check your connection and try again.",
    };
  }

  let data: GoogleSearchResponse;
  try {
    data = (await response.json()) as GoogleSearchResponse;
  } catch {
    return { ok: false, error: "Received an invalid response from Google Places." };
  }

  if (!response.ok) {
    const message =
      data.error?.message ??
      `Google Places returned an error (${response.status}).`;
    return { ok: false, error: message };
  }

  const mapped: PlaceResult[] = (data.places ?? [])
    .filter((place) => place.id && place.displayName?.text)
    .map((place) => ({
      id: place.id!,
      displayName: place.displayName!.text!,
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
