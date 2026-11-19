import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryShell } from "@/components/directory/directory-shell";
import { JsonLd } from "@/components/marketing/json-ld";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { PartnerSlot } from "@/components/partners/partner-slot";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { listingNoun, VENDOR_CATEGORIES } from "@/lib/directory/categories";
import { citySlug, getDirectoryCities, isIndexableCity } from "@/lib/directory/cities";
import { getListingsByCategories } from "@/lib/directory/data";
import { stateBySlug } from "@/lib/directory/states";
import { venueStyles } from "@/lib/directory/venue-style";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

type Params = Promise<{ state: string; city: string }>;

const SECTIONS = [
  { title: "Wedding venues", categories: ["venue"] },
  ...VENDOR_CATEGORIES.map((c) => ({ title: c.plural, categories: [...c.categories] })),
];
const ALL_CATEGORIES = SECTIONS.flatMap((s) => s.categories);

async function load(params: Params) {
  const { state: stateSlug, city: cityParam } = await params;
  const state = stateBySlug(stateSlug);
  if (!state) return null;
  const city = (await getDirectoryCities()).find(
    (c) => c.state === state.code && c.slug === cityParam,
  );
  if (!city) return null;
  const listings = (await getListingsByCategories(state.code, ALL_CATEGORIES)).filter(
    (l) => l.city && citySlug(l.city) === city.slug,
  );
  return { state, city, listings };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { state, city } = found;
  const venues = city.byCategory.venue ?? 0;
  const base = pageMetadata({
    title: `Wedding Venues & Vendors in ${city.city}, ${state.code}`,
    description: `${venues ? `${venues} wedding venue${venues === 1 ? "" : "s"} and ` : ""}local wedding vendors in ${city.city}, ${state.name}. Free to browse, no paid placement.`,
    path: `/wedding-vendors/${state.slug}/city/${city.slug}`,
  });
  return isIndexableCity(city) ? base : { ...base, robots: { index: false, follow: true } };
}

export default async function CityPage({ params }: { params: Params }) {
  const found = await load(params);
  if (!found) notFound();
  const { state, city, listings } = found;
  const path = `/wedding-vendors/${state.slug}/city/${city.slug}`;

  return (
    <DirectoryShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Wedding vendors", path: "/wedding-vendors" },
          { name: state.name, path: `/wedding-vendors/${state.slug}` },
          { name: city.city, path },
        ])}
      />
      <section className="bg-deep px-6 py-12 md:px-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <Eyebrow className="text-deep-eyebrow">
            <Link href={`/wedding-vendors/${state.slug}`} className="no-underline">
              {state.name}
            </Link>
          </Eyebrow>
          <h1 className="mt-3 text-[30px] font-extrabold leading-tight text-white md:text-[42px]">
            Wedding venues &amp; vendors in {city.city}, {state.code}
          </h1>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-white/80">
            {listings.length} listing{listings.length === 1 ? "" : "s"} in {city.city}, ordered by
            name. No one pays to be here or to rank higher.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10 md:px-10">
        {SECTIONS.map((section) => {
          const rows = listings.filter((l) => section.categories.includes(l.category));
          if (!rows.length) return null;
          return (
            <section key={section.title}>
              <h2 className="text-[20px] font-bold text-ink">
                {section.title} <span className="text-muted">{rows.length}</span>
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((l) => {
                  const styles = l.category === "venue" ? venueStyles(l.venue_type) : [];
                  return (
                    <li key={l.slug}>
                      <Link
                        href={`/wedding-vendors/${state.slug}/${l.slug}`}
                        className="block h-full no-underline"
                      >
                        <Card className="h-full p-5 transition-shadow hover:shadow-card-emotional">
                          <span className="block text-[15.5px] font-bold text-ink">{l.name}</span>
                          <span className="block text-[13px] capitalize text-muted">
                            {styles.length ? styles.join(" · ") : listingNoun(l.category)}
                          </span>
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <Card className="grid gap-4 p-6 md:grid-cols-2">
          <div>
            <p className="text-[15px] font-bold text-ink">What will it cost?</p>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Get a starting range for your guest count, then ask each vendor for a real quote.{" "}
              <Link href="/plan/wedding-cost-calculator" className="font-semibold text-accent">
                Wedding cost calculator →
              </Link>
            </p>
          </div>
          <div>
            <p className="text-[15px] font-bold text-ink">Not sure which venue fits?</p>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Three questions, then a shortlist that matches your style.{" "}
              <Link href="/plan/venue-quiz" className="font-semibold text-accent">
                Take the venue quiz →
              </Link>
            </p>
          </div>
        </Card>

        <PartnerSlot placement="directory" />

        <NewsletterSignup source={`city:${state.code}:${city.slug}`.slice(0, 80)} compact />
      </div>
    </DirectoryShell>
  );
}
