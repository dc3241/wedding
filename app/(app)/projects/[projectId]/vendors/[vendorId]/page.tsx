import Link from "next/link";
import { notFound } from "next/navigation";
import { GoogleMapsAttribution } from "@/components/vendors/GoogleMapsAttribution";
import { VendorDetailStatus } from "@/components/vendors/VendorDetailStatus";
import { fetchLivePlaceDetails } from "@/lib/places-live-details";
import { createClient } from "@/utils/supabase/server";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; vendorId: string }>;
}) {
  const { projectId, vendorId } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("project_vendors")
    .select(
      "id, status, vendors(id, name, category, website, contact_email, ai_overview, external_place_id)"
    )
    .eq("project_id", projectId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (!row) notFound();

  const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
  if (!vendor) notFound();

  const live =
    vendor.external_place_id != null
      ? await fetchLivePlaceDetails(vendor.external_place_id)
      : null;

  const hasLiveRating = live?.rating != null;

  return (
    <div className="space-y-8">
      <Link
        href={`/projects/${projectId}/vendors`}
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        ← Back to vendors
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              {vendor.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {vendor.category ?? "Uncategorized"}
            </p>
          </div>
          <VendorDetailStatus
            projectVendorId={row.id}
            status={row.status}
          />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
          {vendor.contact_email ? (
            <a
              href={`mailto:${vendor.contact_email}`}
              className="hover:text-zinc-900"
            >
              {vendor.contact_email}
            </a>
          ) : null}
          {vendor.website ? (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900 underline"
            >
              Website
            </a>
          ) : null}
        </div>
      </header>

      <section className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50/50 p-4">
        <h3 className="text-sm font-medium text-zinc-900">
          Overview from vendor website
        </h3>
        {vendor.ai_overview ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
            {vendor.ai_overview}
          </p>
        ) : (
          <p className="text-sm text-zinc-500">
            No overview yet. Enrichment runs automatically when a vendor is
            added from search, or use Refresh overview on the outreach list.
          </p>
        )}
        <p className="text-xs text-zinc-400">Saved in your wedding project</p>
      </section>

      {vendor.external_place_id ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-zinc-900">
              Live from <span translate="no">Google Maps</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Fetched on this page load — not saved
            </p>
          </div>

          {live ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,12rem)_1fr]">
              {hasLiveRating ? (
                <div className="rounded-md border border-zinc-200 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Rating
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900">
                    {live.rating!.toFixed(1)}{" "}
                    <span className="text-lg text-amber-500">★</span>
                  </p>
                  {live.userRatingCount != null ? (
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {live.userRatingCount.toLocaleString()}{" "}
                      {live.userRatingCount === 1 ? "review" : "reviews"} on{" "}
                      <span translate="no">Google Maps</span>
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 lg:col-span-2">
                  No rating available from Google right now.
                </p>
              )}

              {live.reviews.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Review highlights
                  </p>
                  <ul className="space-y-3">
                    {live.reviews.map((review, index) => (
                      <li
                        key={index}
                        className="rounded-md border border-zinc-200 p-4"
                      >
                        <p className="text-sm leading-relaxed text-zinc-700">
                          {review.text}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          —{" "}
                          {review.authorUri ? (
                            <a
                              href={review.authorUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-zinc-700 underline hover:text-zinc-900"
                            >
                              {review.authorDisplayName}
                            </a>
                          ) : (
                            <span className="font-medium text-zinc-700">
                              {review.authorDisplayName}
                            </span>
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : hasLiveRating ? (
                <p className="text-sm text-zinc-500">
                  No review text available to display.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">
              Could not load live Google Maps data right now. Refresh the page
              to try again.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
            {live?.googleMapsUri ? (
              <a
                href={live.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
              >
                View on Google Maps
              </a>
            ) : (
              <span />
            )}
            <GoogleMapsAttribution />
          </div>
        </section>
      ) : (
        <section className="rounded-md border border-dashed border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">
            This vendor was added manually and is not linked to a Google place,
            so live ratings and reviews are not available.
          </p>
        </section>
      )}
    </div>
  );
}
