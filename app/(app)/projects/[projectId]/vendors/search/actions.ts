"use server";

export type PlaceResult = {
  id: string;
  displayName: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  priceLevel?: string;
};

export type SearchPlacesResponse =
  | { ok: true; places: PlaceResult[] }
  | { ok: false; error: string };

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  priceLevel?: string;
};

type GoogleSearchResponse = {
  places?: GooglePlace[];
  error?: { message?: string; status?: string };
};

export async function searchPlaces(
  category: string,
  location: string
): Promise<SearchPlacesResponse> {
  const trimmedCategory = category.trim();
  const trimmedLocation = location.trim();

  if (!trimmedCategory) {
    return { ok: false, error: "Enter a category or keyword to search." };
  }

  if (!trimmedLocation) {
    return { ok: false, error: "Enter a location to search near." };
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "Places search is not configured. Missing GOOGLE_MAPS_API_KEY.",
    };
  }

  const textQuery = `${trimmedCategory} ${trimmedLocation}`;

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
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.priceLevel",
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: 20,
        }),
      }
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

  const places: PlaceResult[] = (data.places ?? [])
    .filter((place) => place.id && place.displayName?.text)
    .map((place) => ({
      id: place.id!,
      displayName: place.displayName!.text!,
      formattedAddress: place.formattedAddress,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      websiteUri: place.websiteUri,
      priceLevel: place.priceLevel,
    }));

  return { ok: true, places };
}
