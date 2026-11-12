"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ReachOutButton } from "@/components/directory/reach-out-button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";

export type BrowserListing = {
  slug: string;
  name: string;
  city: string | null;
  verified: boolean;
  claimed: boolean;
};

const fieldClass =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink placeholder:text-muted";

export function VendorBrowser({
  listings,
  stateSlug,
  stateName,
  noun,
  nounPlural,
}: {
  listings: readonly BrowserListing[];
  stateSlug: string;
  stateName: string;
  noun: string;
  nounPlural: string;
}) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");

  const cities = useMemo(
    () => [...new Set(listings.map((l) => l.city).filter((c): c is string => Boolean(c)))].sort(),
    [listings],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (city && l.city !== city) return false;
      if (q && !`${l.name} ${l.city ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [listings, query, city]);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-muted">
            Search
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or city"
              className={cn(fieldClass, "normal-case tracking-normal")}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-muted">
            City
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={cn(fieldClass, "normal-case tracking-normal")}
            >
              <option value="">All of {stateName}</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </Card>
        <p className="px-1 text-[12px] leading-relaxed text-muted">
          Listings are ordered by city, then name. Nobody can pay to rank higher.
        </p>
      </aside>

      <section aria-label={`${nounPlural} in ${stateName}`} className="flex flex-col gap-3">
        <p className="px-1 text-[13px] font-semibold text-muted" aria-live="polite">
          {shown.length} {shown.length === 1 ? noun : nounPlural}
        </p>
        {shown.length === 0 ? (
          <Card className="p-8 text-center text-[15px] text-muted">
            Nothing matches. Try clearing a filter.
          </Card>
        ) : (
          shown.map((l) => (
            <Card key={l.slug} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link
                  href={`/wedding-vendors/${stateSlug}/${l.slug}`}
                  className="text-[17px] font-bold text-ink no-underline hover:text-accent"
                >
                  {l.name}
                </Link>
                <p className="mt-0.5 text-[14px] text-muted">
                  {[l.city, stateName].filter(Boolean).join(", ")}
                </p>
                {l.claimed ? (
                  <div className="mt-2">
                    <Pill variant="sage">Claimed</Pill>
                  </div>
                ) : null}
              </div>
              <ReachOutButton slug={l.slug} className="shrink-0" />
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
