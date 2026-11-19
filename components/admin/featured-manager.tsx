"use client";

import {
  searchListings,
  setFeatured,
  type AdminListing,
} from "@/app/(admin)/admin/featured/actions";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";

const fieldClass =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink placeholder:text-muted";

function status(l: AdminListing): string {
  if (!l.featured_until) return "Not featured";
  const until = new Date(l.featured_until);
  const label = until.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return until > new Date() ? `Featured until ${label}` : `Ended ${label}`;
}

export function FeaturedManager({ initialRows }: { initialRows: AdminListing[] }) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AdminListing[]>(initialRows);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function load(q: string) {
    setError(null);
    startTransition(async () => {
      try {
        setRows(await searchListings(q));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed.");
      }
    });
  }

  function feature(id: string, days: number | null) {
    startTransition(async () => {
      try {
        const until = await setFeatured(id, days);
        setRows((cur) => cur.map((r) => (r.id === id ? { ...r, featured_until: until } : r)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(query);
        }}
        className="flex gap-2 rounded-[var(--radius-card)] bg-surface p-4 shadow-raised"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a vendor by name"
          className={fieldClass}
        />
        <Button type="submit" disabled={pending}>
          Search
        </Button>
      </form>
      {error ? <p className="text-[13.5px] font-medium text-rosewood">{error}</p> : null}
      <div className="rounded-[var(--radius-card)] bg-surface p-2 shadow-raised">
        {rows.length === 0 ? (
          <p className="p-5 text-[14px] text-muted">
            {pending ? "Loading…" : query ? "No listings match." : "Nothing featured yet. Search for a vendor to feature."}
          </p>
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{r.name}</p>
                  <p className="text-[12.5px] text-muted">
                    {r.category} · {[r.city, r.state].filter(Boolean).join(", ")}
                    {r.published ? "" : " · not published"} · {status(r)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="default" disabled={pending || !r.published} onClick={() => feature(r.id, 30)}>
                    30 days
                  </Button>
                  <Button variant="default" disabled={pending || !r.published} onClick={() => feature(r.id, 90)}>
                    90 days
                  </Button>
                  {r.featured_until ? (
                    <Button variant="ghost" disabled={pending} onClick={() => feature(r.id, null)}>
                      Clear
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
