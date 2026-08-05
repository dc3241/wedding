export type PlacesPriceLevel =
  | "PRICE_LEVEL_FREE"
  | "PRICE_LEVEL_INEXPENSIVE"
  | "PRICE_LEVEL_MODERATE"
  | "PRICE_LEVEL_EXPENSIVE"
  | "PRICE_LEVEL_VERY_EXPENSIVE";

export type PlacesTextSearchPlace = {
  id: string;
  name: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  primaryType?: string;
  types?: string[];
  /** First photo resource name (`places/.../photos/...`), if any. */
  photoName?: string;
  priceLevel?: PlacesPriceLevel;
  openNow?: boolean;
};

export type PlacesTextSearchResponse =
  | { ok: true; places: PlacesTextSearchPlace[] }
  | { ok: false; error: string };

type GooglePlacePhoto = {
  name?: string;
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  primaryType?: string;
  types?: string[];
  photos?: GooglePlacePhoto[];
  priceLevel?: PlacesPriceLevel | "PRICE_LEVEL_UNSPECIFIED";
  regularOpeningHours?: { openNow?: boolean };
};

type GoogleSearchResponse = {
  places?: GooglePlace[];
  error?: { message?: string; status?: string };
};

const FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.primaryType,places.types,places.photos,places.priceLevel,places.regularOpeningHours";

function mapPriceLevel(
  value: GooglePlace["priceLevel"],
): PlacesPriceLevel | undefined {
  if (
    value === "PRICE_LEVEL_FREE" ||
    value === "PRICE_LEVEL_INEXPENSIVE" ||
    value === "PRICE_LEVEL_MODERATE" ||
    value === "PRICE_LEVEL_EXPENSIVE" ||
    value === "PRICE_LEVEL_VERY_EXPENSIVE"
  ) {
    return value;
  }
  return undefined;
}

export async function placesTextSearch(options: {
  textQuery: string;
  includedType?: string;
  maxResultCount?: number;
  strictTypeFiltering?: boolean;
  includePureServiceAreaBusinesses?: boolean;
}): Promise<PlacesTextSearchResponse> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "Places search is not configured. Missing GOOGLE_MAPS_API_KEY.",
    };
  }

  const requestBody: Record<string, unknown> = {
    textQuery: options.textQuery,
  };

  if (options.maxResultCount !== undefined) {
    requestBody.maxResultCount = options.maxResultCount;
  }

  if (options.includePureServiceAreaBusinesses !== undefined) {
    requestBody.includePureServiceAreaBusinesses =
      options.includePureServiceAreaBusinesses;
  }

  if (options.includedType !== undefined) {
    requestBody.includedType = options.includedType;
  }

  if (options.strictTypeFiltering !== undefined) {
    requestBody.strictTypeFiltering = options.strictTypeFiltering;
  }

  let response: Response;
  try {
    response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
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
    return {
      ok: false,
      error: "Received an invalid response from Google Places.",
    };
  }

  if (!response.ok) {
    const message =
      data.error?.message ??
      `Google Places returned an error (${response.status}).`;
    return { ok: false, error: message };
  }

  const places: PlacesTextSearchPlace[] = (data.places ?? [])
    .filter((place) => place.id && place.displayName?.text)
    .map((place) => {
      const photoName = place.photos?.find((photo) => photo.name?.trim())?.name;

      return {
        id: place.id!,
        name: place.displayName!.text!,
        formattedAddress: place.formattedAddress,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        websiteUri: place.websiteUri,
        primaryType: place.primaryType,
        types: place.types,
        photoName: photoName?.trim() || undefined,
        priceLevel: mapPriceLevel(place.priceLevel),
        openNow: place.regularOpeningHours?.openNow,
      };
    });

  return { ok: true, places };
}
