import Link from "next/link";
import { notFound } from "next/navigation";
import { GoogleMapsAttribution } from "@/components/vendors/GoogleMapsAttribution";
import { GooglePlaceRating } from "@/components/vendors/GooglePlaceRating";
import { GoogleReviewList } from "@/components/vendors/GoogleReviewList";
import { VendorContactFields } from "@/components/vendors/VendorContactFields";
import { VendorDetailStatus } from "@/components/vendors/VendorDetailStatus";
import { VendorPipelineStepper } from "@/components/vendors/VendorPipelineStepper";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getAccountContext } from "@/lib/account-context";
import { fetchLivePlaceDetails } from "@/lib/places-live-details";
import { canShareProjectVendors } from "@/lib/vendors/can-share";
import { vendorCategoryLabel } from "@/lib/vendor-categories";
import { createClient } from "@/utils/supabase/server";
import { ShareVendorDetailsControl } from "@/components/vendors/ShareVendorDetailsControl";
import { OwnerVendorShareInbox } from "@/components/vendors/VendorShareInboxBound";
import { parseVendorShareMessages } from "@/lib/vendors/share-messages";
import { displayCoupleNames } from "@/lib/wedding-date";

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; vendorId: string }>;
}) {
  const { projectId, vendorId } = await params;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  const canShare = canShareProjectVendors(account, projectId);

  const [
    { data: row },
    { data: targetRows },
    { data: bookedPvRows },
    stampResult,
    { data: project },
  ] = await Promise.all([
      supabase
        .from("project_vendors")
        .select(
          "id, status, quoted_price, confirm_token, vendors(id, name, category, website, contact_email, contact_phone, address, ai_overview, external_place_id)",
        )
        .eq("project_id", projectId)
        .eq("vendor_id", vendorId)
        .maybeSingle(),
      supabase
        .from("vendor_targets")
        .select("id, category, status, project_vendor_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("project_vendors")
        .select("id, vendors(name)")
        .eq("project_id", projectId)
        .eq("status", "booked"),
      supabase
        .from("project_vendors")
        .select("share_sent_at")
        .eq("project_id", projectId)
        .eq("vendor_id", vendorId)
        .maybeSingle(),
      supabase.from("projects").select("name").eq("id", projectId).maybeSingle(),
    ]);

  if (!row) notFound();
  const shareSentAt = stampResult.error
    ? null
    : stampResult.data?.share_sent_at ?? null;
  const coupleNames = displayCoupleNames(project?.name ?? "Your wedding");

  const threadResult = await supabase
    .from("vendor_share_messages")
    .select("id, author, body, created_at")
    .eq("project_id", projectId)
    .eq("project_vendor_id", row.id)
    .order("created_at", { ascending: true });
  const messages = threadResult.error
    ? []
    : parseVendorShareMessages(threadResult.data);

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

  const nameByPvId = new Map(
    (bookedPvRows ?? []).flatMap((pv) => {
      const v = Array.isArray(pv.vendors) ? pv.vendors[0] : pv.vendors;
      if (!v || typeof v !== "object" || !("name" in v)) return [];
      return [[pv.id, String((v as { name: string }).name)]] as const;
    }),
  );

  const slotTargets = (targetRows ?? []).map((t) => ({
    id: t.id,
    category: t.category,
    status: t.status as "needed" | "booked" | "skipped",
    project_vendor_id: t.project_vendor_id ?? null,
    linkedVendorName: t.project_vendor_id
      ? (nameByPvId.get(t.project_vendor_id) ?? null)
      : null,
  }));

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
                {vendor.category
                  ? vendorCategoryLabel(vendor.category)
                  : "Uncategorized"}
              </p>
            </div>
            <VendorDetailStatus
              projectVendorId={row.id}
              status={row.status}
              quotedPrice={quotedPrice}
              vendorCategory={vendor.category}
              slotTargets={slotTargets}
            />
          </header>

          {row.status !== "booked" && row.status !== "declined" ? (
            <VendorPipelineStepper
              status={
                row.status as
                  | "to_contact"
                  | "contacted"
                  | "replied"
                  | "booked"
                  | "declined"
              }
            />
          ) : null}

          {(vendor.contact_email ||
            vendor.contact_phone ||
            vendor.address ||
            vendor.website) && (
            <div className="flex flex-col gap-1 text-[13px]">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {vendor.contact_email ? (
                  <a
                    href={`mailto:${vendor.contact_email}`}
                    className="text-accent hover:opacity-80"
                  >
                    {vendor.contact_email}
                  </a>
                ) : null}
                {vendor.contact_phone ? (
                  <a
                    href={`tel:${vendor.contact_phone}`}
                    className="text-accent hover:opacity-80"
                  >
                    {vendor.contact_phone}
                  </a>
                ) : null}
                {vendor.website ? (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:opacity-80"
                  >
                    Website
                  </a>
                ) : null}
              </div>
              {vendor.address ? (
                <p className="font-medium text-ink">{vendor.address}</p>
              ) : null}
            </div>
          )}

          <VendorContactFields
            vendorId={vendor.id}
            contactPhone={vendor.contact_phone ?? null}
            address={vendor.address ?? null}
          />

          {row.status !== "declined" ? (
            <>
              <ShareVendorDetailsControl
                projectVendorId={row.id}
                confirmToken={row.confirm_token}
                vendorName={vendor.name}
                contactEmail={vendor.contact_email ?? null}
                shareSentAt={shareSentAt}
                canEmail={canShare}
              />
              <OwnerVendorShareInbox
                projectVendorId={row.id}
                messages={messages}
                ownerLabel={coupleNames}
                vendorLabel={vendor.name}
              />
            </>
          ) : null}

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
