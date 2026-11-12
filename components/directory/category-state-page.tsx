import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DirectoryShell } from "@/components/directory/directory-shell";
import { VendorBrowser } from "@/components/directory/vendor-browser";
import { JsonLd } from "@/components/marketing/json-ld";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  categoryByPath,
  MIN_INDEXABLE_LISTINGS,
  VENDOR_CATEGORIES,
} from "@/lib/directory/categories";
import { getListingsByCategories } from "@/lib/directory/data";
import { stateBySlug } from "@/lib/directory/states";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export async function categoryStateMetadata(
  categoryPath: string,
  stateSlug: string,
): Promise<Metadata> {
  const cat = categoryByPath(categoryPath);
  const state = stateBySlug(stateSlug);
  if (!cat || !state) return {};
  const listings = await getListingsByCategories(state.code, cat.categories);
  const base = pageMetadata({
    title: `${cat.plural} in ${state.name}`,
    description: `Browse ${listings.length || ""} ${cat.plural.toLowerCase()} in ${state.name}. Free, no paid placement. Reach out from your own planning workspace.`.replace(/\s+/g, " "),
    path: `/wedding-vendors/${state.slug}/${cat.path}`,
  });
  return listings.length < MIN_INDEXABLE_LISTINGS
    ? { ...base, robots: { index: false, follow: true } }
    : base;
}

export async function CategoryStatePage({
  categoryPath,
  stateSlug,
}: {
  categoryPath: string;
  stateSlug: string;
}) {
  const cat = categoryByPath(categoryPath);
  const state = stateBySlug(stateSlug);
  if (!cat || !state) notFound();
  const listings = await getListingsByCategories(state.code, cat.categories);
  const path = `/wedding-vendors/${state.slug}/${cat.path}`;

  return (
    <DirectoryShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Wedding vendors", path: "/wedding-vendors" },
          { name: state.name, path: `/wedding-vendors/${state.slug}` },
          { name: cat.plural, path },
        ])}
      />
      <section className="bg-deep px-6 py-12 md:px-10 md:py-14">
        <div className="mx-auto max-w-6xl">
          <Eyebrow className="text-deep-eyebrow">
            <Link href={`/wedding-vendors/${state.slug}`} className="no-underline">
              ← {state.name}
            </Link>
          </Eyebrow>
          <h1 className="mt-3 text-[30px] font-extrabold leading-tight text-white md:text-[42px]">
            {cat.plural} in {state.name}
          </h1>
          <nav aria-label="Vendor types" className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/wedding-vendors/${state.slug}`}
              className="rounded-[var(--radius-pill)] border border-white/30 px-3 py-1.5 text-[13px] font-semibold text-white no-underline"
            >
              Venues
            </Link>
            {VENDOR_CATEGORIES.map((c) => (
              <Link
                key={c.path}
                href={`/wedding-vendors/${state.slug}/${c.path}`}
                aria-current={c.path === cat.path ? "page" : undefined}
                className={
                  c.path === cat.path
                    ? "rounded-[var(--radius-pill)] bg-white px-3 py-1.5 text-[13px] font-semibold text-ink no-underline"
                    : "rounded-[var(--radius-pill)] border border-white/30 px-3 py-1.5 text-[13px] font-semibold text-white no-underline"
                }
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
            <p className="text-[17px] font-bold">
              We&apos;re still adding {cat.plural.toLowerCase()} in {state.name}.
            </p>
            <p className="mt-2 text-[15px] text-muted">
              Check back soon, or browse venues and other states.
            </p>
            <Link href={`/wedding-vendors/${state.slug}`} className="mt-4 inline-block font-semibold text-accent">
              Venues in {state.name}
            </Link>
          </Card>
        ) : (
          <VendorBrowser
            listings={listings}
            stateSlug={state.slug}
            stateName={state.name}
            noun={cat.singular.replace("wedding ", "")}
            nounPlural={cat.plural.replace("Wedding ", "").toLowerCase()}
          />
        )}
      </div>
    </DirectoryShell>
  );
}
