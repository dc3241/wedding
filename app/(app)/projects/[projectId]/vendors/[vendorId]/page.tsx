import Link from "next/link";
import { notFound } from "next/navigation";
import { GoogleMapsAttribution } from "@/components/vendors/GoogleMapsAttribution";
import { GooglePlaceRating } from "@/components/vendors/GooglePlaceRating";
import { GoogleReviewList } from "@/components/vendors/GoogleReviewList";
import { VendorDetailStatus } from "@/components/vendors/VendorDetailStatus";
import { VendorPipelineStepper } from "@/components/vendors/VendorPipelineStepper";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
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
      "id, status, quoted_price, vendors(id, name, category, website, contact_email, ai_overview, external_place_id)",
    )
    .eq("project_id", projectId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (!row) notFound();

  const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
  if (!vendor) notFound();

  const quotedPrice =
    row.quoted_price === null || row.quoted_price === undefined
      ? null
      : Number(row.quoted_price);

  const live =
    vendor.external_place_id != null
      ? await fetchLivePlaceDetails(vendor.external_place_id)
      : null;

  const hasLiveRating = live?.rating != null;

  return (
    <div className="space-y-6">
      <Link
        href={`/projects/${projectId}/vendors`}
        className="text-[13px] text-muted hover:text-ink"
      >
        ← Back to vendors
      </Link>

      <Card className="overflow-hidden">
        <div className="space-y-5 p-6">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-[20px] font-medium text-ink">{vendor.name}</h1>
              <p className="mt-px text-[13px] text-muted">
                {vendor.category ?? "Uncategorized"}
              </p>
            </div>
            <VendorDetailStatus
              projectVendorId={row.id}
              status={row.status}
              quotedPrice={quotedPrice}
            />
          </header>

          <VendorPipelineStepper
            status={row.status as "to_contact" | "contacted" | "booked" | "declined"}
          />

          {(vendor.contact_email || vendor.website) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
              {vendor.contact_email ? (
                <a
                  href={`mailto:${vendor.contact_email}`}
                  className="text-accent hover:text-accent"
                >
                  {vendor.contact_email}
                </a>
              ) : null}
              {vendor.website ? (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent"
                >
                  Website
                </a>
              ) : null}
            </div>
          )}

          <div>
            <Eyebrow>Overview</Eyebrow>
            {vendor.ai_overview ? (
              <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink">
                {vendor.ai_overview}
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-muted">
                No overview yet. Enrichment runs automatically when a vendor is
                added from search, or use Refresh overview on the outreach list.
              </p>
            )}
          </div>
        </div>

        {vendor.external_place_id ? (
          <div className="border-t border-hairline p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Eyebrow>
                Live from <span translate="no">Google Maps</span>
              </Eyebrow>
              <p className="text-[13px] text-muted">
                Fetched on this page load — not saved
              </p>
            </div>

            {live ? (
              <div className="mt-5 space-y-6">
                {hasLiveRating ? (
                  <GooglePlaceRating
                    rating={live.rating!}
                    userRatingCount={live.userRatingCount}
                  />
                ) : (
                  <p className="text-[13px] text-muted">
                    No rating available from Google right now.
                  </p>
                )}

                {live.reviews.length > 0 ? (
                  <div>
                    <p className="mb-3 text-sm font-medium text-ink">
                      Review highlights
                    </p>
                    <GoogleReviewList reviews={live.reviews} />
                  </div>
                ) : hasLiveRating ? (
                  <p className="text-[13px] text-muted">
                    No review text available to display.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 text-[13px] text-muted">
                Could not load live Google Maps data right now. Refresh the page
                to try again.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
              {live?.googleMapsUri ? (
                <a
                  href={live.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-medium text-accent hover:text-accent"
                >
                  View on <span translate="no">Google Maps</span>
                </a>
              ) : (
                <span />
              )}
              <GoogleMapsAttribution />
            </div>
          </div>
        ) : (
          <div className="border-t border-hairline p-6">
            <p className="text-[13px] text-muted">
              This vendor was added manually and is not linked to a Google
              place, so live ratings and reviews are not available.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
