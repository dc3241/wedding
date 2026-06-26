import { cn } from "@/lib/cn";

export function GooglePlaceRating({
  rating,
  userRatingCount,
  className,
}: {
  rating: number;
  userRatingCount?: number | null;
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-ink-muted", className)}>
      <span className="tabnum font-medium text-ink">{rating.toFixed(1)}</span>
      {userRatingCount != null ? (
        <>
          {" "}
          ·{" "}
          <span className="tabnum">
            {userRatingCount.toLocaleString()}
          </span>{" "}
          {userRatingCount === 1 ? "review" : "reviews"}
        </>
      ) : null}{" "}
      on <span translate="no">Google Maps</span>
    </p>
  );
}
