import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryShell } from "@/components/directory/directory-shell";
import { ReachOutButton } from "@/components/directory/reach-out-button";
import { JsonLd } from "@/components/marketing/json-ld";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";
import { getListingBySlug } from "@/lib/directory/data";
import { stateBySlug } from "@/lib/directory/states";
import { venueStyles } from "@/lib/directory/venue-style";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Params = Promise<{ state: string; slug: string }>;

async function load(params: Params) {
  const { state: stateSlug, slug } = await params;
  const state = stateBySlug(stateSlug);
  const listing = state ? await getListingBySlug(slug) : null;
  if (!state || !listing || listing.state !== state.code) return null;
  return { state, listing };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { state, listing } = found;
  const where = [listing.city, state.name].filter(Boolean).join(", ");
  return pageMetadata({
    title: `${listing.name} — Wedding Venue in ${where}`,
    description: `${listing.name} is a wedding venue in ${where}. Reach out from your free First Look planning workspace.`,
    path: `/wedding-vendors/${state.slug}/${listing.slug}`,
  });
}

export default async function ListingPage({ params }: { params: Params }) {
  const found = await load(params);
  if (!found) notFound();
  const { state, listing } = found;
  const path = `/wedding-vendors/${state.slug}/${listing.slug}`;
  const where = [listing.city, state.name].filter(Boolean).join(", ");
  const siteHost = listing.website ? safeHost(listing.website) : null;

  return (
    <DirectoryShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Wedding venues", path: "/wedding-vendors" },
          { name: state.name, path: `/wedding-vendors/${state.slug}` },
          { name: listing.name, path },
        ])}
      />
      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10">
        <Eyebrow>
          <Link href={`/wedding-vendors/${state.slug}`} className="no-underline">
            ← Venues in {state.name}
          </Link>
        </Eyebrow>
        <h1 className="mt-3 text-[32px] font-extrabold leading-tight md:text-[40px]">
          {listing.name}
        </h1>
        <p className="mt-1 text-[16px] text-muted">{where}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {venueStyles(listing.venue_type).map((s) => (
            <Pill key={s}>{s}</Pill>
          ))}
          {listing.claimed ? <Pill variant="sage">Claimed</Pill> : null}
        </div>

        <Card className="mt-8 flex flex-col gap-4 p-6">
          <h2 className="text-[18px] font-bold">Interested in {listing.name}?</h2>
          <p className="text-[15px] leading-relaxed text-muted">
            Reach out through your free First Look workspace. We add the venue to your
            vendor list, draft the inquiry with your date and guest count, and you send it
            from your own email, so replies land with you.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ReachOutButton slug={listing.slug}>Reach out to this venue</ReachOutButton>
            {listing.website && siteHost ? (
              <a
                href={listing.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-[14px] font-semibold text-accent"
              >
                Visit {siteHost}
              </a>
            ) : null}
          </div>
        </Card>

        {!listing.verified ? (
          <p className="mt-6 text-[13px] leading-relaxed text-muted">
            We&apos;re still verifying this listing&apos;s details.
            {!listing.claimed ? (
              <>
                {" "}
                Own this venue?{" "}
                <Link href="/contact" className="font-semibold text-accent">
                  Get in touch to claim it, free.
                </Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </DirectoryShell>
  );
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
