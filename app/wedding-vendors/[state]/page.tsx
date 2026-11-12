import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryShell } from "@/components/directory/directory-shell";
import { VenueBrowser } from "@/components/directory/venue-browser";
import { JsonLd } from "@/components/marketing/json-ld";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { VENDOR_CATEGORIES } from "@/lib/directory/categories";
import { getListingsByState } from "@/lib/directory/data";
import { DIRECTORY_STATES, stateBySlug } from "@/lib/directory/states";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export function generateStaticParams() {
  return DIRECTORY_STATES.map((s) => ({ state: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const state = stateBySlug((await params).state);
  if (!state) return {};
  const listings = await getListingsByState(state.code);
  const base = pageMetadata({
    title: `Wedding Venues in ${state.name}`,
    description: `Browse ${listings.length || ""} wedding venues in ${state.name}. Free, no paid placement. Reach out to a venue from your own planning workspace.`.replace(/\s+/g, " "),
    path: `/wedding-vendors/${state.slug}`,
  });
  // Thin pages stay out of the index until there is real content.
  return listings.length === 0 ? { ...base, robots: { index: false, follow: true } } : base;
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const state = stateBySlug((await params).state);
  if (!state) notFound();
  const listings = await getListingsByState(state.code);

  return (
    <DirectoryShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Wedding venues", path: "/wedding-vendors" },
          { name: state.name, path: `/wedding-vendors/${state.slug}` },
        ])}
      />
      <section className="bg-deep px-6 py-12 md:px-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <Eyebrow className="text-deep-eyebrow">
            <Link href="/wedding-vendors" className="no-underline">
              Wedding venues
            </Link>
          </Eyebrow>
          <h1 className="mt-3 text-[30px] font-extrabold leading-tight text-white md:text-[42px]">
            Wedding venues in {state.name}
          </h1>
          <nav aria-label="Vendor types" className="mt-5 flex flex-wrap gap-2">
            <span
              aria-current="page"
              className="rounded-[var(--radius-pill)] bg-white px-3 py-1.5 text-[13px] font-semibold text-ink"
            >
              Venues
            </span>
            {VENDOR_CATEGORIES.map((c) => (
              <Link
                key={c.path}
                href={`/wedding-vendors/${state.slug}/${c.path}`}
                className="rounded-[var(--radius-pill)] border border-white/30 px-3 py-1.5 text-[13px] font-semibold text-white no-underline"
              >
                {c.tab}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        {listings.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-[17px] font-bold">We&apos;re still adding {state.name}.</p>
            <p className="mt-2 text-[15px] text-muted">
              Check back soon, or browse another state.
            </p>
            <Link href="/wedding-vendors" className="mt-4 inline-block font-semibold text-accent">
              All states
            </Link>
          </Card>
        ) : (
          <VenueBrowser
            listings={listings}
            stateSlug={state.slug}
            stateName={state.name}
          />
        )}

        <Card className="mt-10 grid gap-6 p-6 md:grid-cols-3">
          {[
            ["1. Pick a venue", "Tap Reach out on any venue you like."],
            ["2. Free workspace", "Create your free First Look account. It takes a minute."],
            ["3. Send from your inbox", "We draft the inquiry. You review it and send it from your own email."],
          ].map(([title, text]) => (
            <div key={title}>
              <p className="text-[15px] font-bold">{title}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </Card>
      </div>
    </DirectoryShell>
  );
}
