export type LivePlaceReview = {
  text: string;
  authorDisplayName: string;
  authorUri: string | null;
};

export type LivePlaceDetails = {
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
  reviews: LivePlaceReview[];
};

type GoogleReview = {
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: {
    displayName?: string;
    uri?: string;
  };
};

type GooglePlaceDetailsResponse = {
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: GoogleReview[];
  error?: { message?: string };
};

const MAX_REVIEWS = 3;

export async function fetchLivePlaceDetails(
  placeId: string
): Promise<LivePlaceDetails | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "rating,userRatingCount,reviews,googleMapsUri",
        },
        next: { revalidate: 0 },
      }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as GooglePlaceDetailsResponse;
    if (data.error) return null;

    const reviews = (data.reviews ?? [])
      .map((review) => {
        const text =
          review.text?.text?.trim() ||
          review.originalText?.text?.trim() ||
          "";
        const authorDisplayName =
          review.authorAttribution?.displayName?.trim() || "Google user";

        if (!text) return null;

        return {
          text,
          authorDisplayName,
          authorUri: review.authorAttribution?.uri?.trim() || null,
        };
      })
      .filter((review): review is LivePlaceReview => review !== null)
      .slice(0, MAX_REVIEWS);

    return {
      rating: data.rating ?? null,
      userRatingCount: data.userRatingCount ?? null,
      googleMapsUri: data.googleMapsUri?.trim() || null,
      reviews,
    };
  } catch {
    return null;
  }
}
