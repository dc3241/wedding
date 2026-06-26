import type { LivePlaceReview } from "@/lib/places-live-details";

function ReviewAuthor({
  displayName,
  uri,
}: {
  displayName: string;
  uri: string | null;
}) {
  if (uri) {
    return (
      <a
        href={uri}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ink underline hover:text-plum-deep"
      >
        {displayName}
      </a>
    );
  }

  return <span className="font-medium text-ink">{displayName}</span>;
}

export function GoogleReviewList({ reviews }: { reviews: LivePlaceReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <ul className="divide-y divide-stone">
      {reviews.map((review, index) => (
        <li key={index} className="py-4 first:pt-0 last:pb-0">
          <p className="text-[15px] leading-relaxed text-ink">{review.text}</p>
          <p className="mt-2 text-[13px] text-ink-muted">
            —{" "}
            <ReviewAuthor
              displayName={review.authorDisplayName}
              uri={review.authorUri}
            />
          </p>
        </li>
      ))}
    </ul>
  );
}
