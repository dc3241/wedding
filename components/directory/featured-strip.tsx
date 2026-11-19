import { Card } from "@/components/ui/card";
import { listingNoun } from "@/lib/directory/categories";
import type { DirectoryListing } from "@/lib/directory/data";
import { venueStyles } from "@/lib/directory/venue-style";
import Link from "next/link";

/**
 * MEDIA-08: paid "Featured" row. Always labeled, always separate from the
 * main list, which keeps its city-then-name order.
 */
export function FeaturedStrip({
  listings,
  stateSlug,
}: {
  listings: readonly DirectoryListing[];
  stateSlug: string;
}) {
  if (!listings.length) return null;
  return (
    <section className="mb-8" aria-labelledby="featured-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="featured-heading" className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
          Featured
        </h2>
        <Link href="/disclosure" className="text-[12px] text-muted underline-offset-2 hover:underline">
          Featured vendors pay for this spot
        </Link>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((l) => {
          const styles = l.category === "venue" ? venueStyles(l.venue_type) : [];
          return (
            <li key={l.slug}>
              <Link href={`/wedding-vendors/${stateSlug}/${l.slug}`} className="block h-full no-underline">
                <Card className="h-full border border-accent/30 p-5 transition-shadow hover:shadow-card-emotional">
                  <span className="mb-2 inline-block rounded-[var(--radius-pill)] bg-accent-wash px-2.5 py-0.5 text-[11.5px] font-semibold text-accent">
                    Featured
                  </span>
                  <span className="block text-[15.5px] font-bold text-ink">{l.name}</span>
                  <span className="block text-[13px] text-muted">
                    {[l.city, styles.length ? styles.join(" · ") : listingNoun(l.category)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
