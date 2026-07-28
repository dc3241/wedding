"use client";

import { useMemo, useState } from "react";
import { ExternalRegistryLinks } from "./ExternalRegistryLinks";
import { PublicRegistryCard } from "./PublicRegistryCard";
import type { ExternalRegistryLink, PublicRegistryItem } from "./types";
import { storeLabelFromUrl } from "@/lib/registry";

type SortKey = "default" | "price-asc" | "price-desc" | "store";
type AvailabilityFilter = "all" | "available";

const selectClass =
  "rounded-full border bg-transparent px-3 py-1.5 text-[13px] font-medium outline-none";

export function PublicRegistryView({
  items,
  externalLinks,
  slug,
}: {
  items: PublicRegistryItem[];
  externalLinks: ExternalRegistryLink[];
  slug: string;
}) {
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [store, setStore] = useState("all");
  const [sort, setSort] = useState<SortKey>("default");

  const stores = useMemo(() => {
    const labels = new Set<string>();
    for (const item of items) {
      const label = storeLabelFromUrl(item.buyUrl);
      if (label) labels.add(label);
    }
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    let next = [...items];

    void category;

    if (availability === "available") {
      next = next.filter(
        (item) => item.quantityWanted - item.claimedQty > 0,
      );
    }

    if (store !== "all") {
      next = next.filter((item) => storeLabelFromUrl(item.buyUrl) === store);
    }

    if (sort === "price-asc") {
      next.sort(
        (a, b) =>
          (a.price ?? Number.POSITIVE_INFINITY) -
          (b.price ?? Number.POSITIVE_INFINITY),
      );
    } else if (sort === "price-desc") {
      next.sort(
        (a, b) =>
          (b.price ?? Number.NEGATIVE_INFINITY) -
          (a.price ?? Number.NEGATIVE_INFINITY),
      );
    } else if (sort === "store") {
      next.sort((a, b) => {
        const sa = storeLabelFromUrl(a.buyUrl) ?? "";
        const sb = storeLabelFromUrl(b.buyUrl) ?? "";
        return sa.localeCompare(sb) || a.name.localeCompare(b.name);
      });
    }

    return next;
  }, [items, category, availability, store, sort]);

  const count = filtered.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="font-serif-display text-[32px] tracking-[0.005em]"
            style={{ color: "var(--ws-ink)" }}
          >
            Registry
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--ws-muted)" }}>
            {count === 1 ? "1 gift" : `${count} gifts`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2" style={{ color: "var(--ws-ink)" }}>
          <label className="sr-only" htmlFor="registry-category">
            Category
          </label>
          <select
            id="registry-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectClass}
            style={{ borderColor: "var(--ws-border)", color: "var(--ws-ink)" }}
          >
            <option value="all">Category</option>
          </select>

          <label className="sr-only" htmlFor="registry-availability">
            Availability
          </label>
          <select
            id="registry-availability"
            value={availability}
            onChange={(e) =>
              setAvailability(e.target.value as AvailabilityFilter)
            }
            className={selectClass}
            style={{ borderColor: "var(--ws-border)", color: "var(--ws-ink)" }}
          >
            <option value="all">Availability</option>
            <option value="available">Available</option>
          </select>

          <label className="sr-only" htmlFor="registry-sort">
            Price
          </label>
          <select
            id="registry-sort"
            value={
              sort === "price-asc" || sort === "price-desc" ? sort : "default"
            }
            onChange={(e) => {
              const value = e.target.value as SortKey;
              setSort(value === "default" ? "default" : value);
            }}
            className={selectClass}
            style={{ borderColor: "var(--ws-border)", color: "var(--ws-ink)" }}
          >
            <option value="default">Price</option>
            <option value="price-asc">Price · low to high</option>
            <option value="price-desc">Price · high to low</option>
          </select>

          <label className="sr-only" htmlFor="registry-store">
            Store
          </label>
          <select
            id="registry-store"
            value={store}
            onChange={(e) => {
              setStore(e.target.value);
              if (e.target.value !== "all") setSort("store");
            }}
            className={selectClass}
            style={{ borderColor: "var(--ws-border)", color: "var(--ws-ink)" }}
          >
            <option value="all">Store</option>
            {stores.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ExternalRegistryLinks links={externalLinks} />

      {count === 0 ? (
        <p
          className="py-10 text-center text-[15px]"
          style={{ color: "var(--ws-muted)" }}
        >
          No gifts to show yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <PublicRegistryCard item={item} slug={slug} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
