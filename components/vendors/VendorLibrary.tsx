"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import {
  DIRECTORY_COLS,
  VendorDirectoryRow,
} from "@/components/vendors/VendorDirectoryRow";
import { cn } from "@/lib/cn";
import {
  VENDOR_CATEGORIES,
  vendorCategoryLabel,
} from "@/lib/vendor-categories";

export type LibraryVendor = {
  id: string;
  name: string;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  service_area: string | null;
  address: string | null;
  notes: string | null;
  is_preferred: boolean;
  instagram: string | null;
  linkCount: number;
};

const UNCATEGORIZED_KEY = "__uncategorized__";
const ALL_CATEGORIES = "all";
const KNOWN_ORDER = VENDOR_CATEGORIES.map((c) => c.id);

type SortKey = "preferred" | "name" | "linked";

function matchesSearch(vendor: LibraryVendor, query: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  if (vendor.name.toLowerCase().includes(q)) return true;
  if (vendor.instagram?.toLowerCase().includes(q)) return true;
  return false;
}

function sortVendors(vendors: LibraryVendor[], sort: SortKey) {
  return [...vendors].sort((a, b) => {
    if (sort === "preferred") {
      if (a.is_preferred !== b.is_preferred) return a.is_preferred ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    if (sort === "linked") {
      if (a.linkCount !== b.linkCount) return b.linkCount - a.linkCount;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function uniqueCategoryCount(vendors: LibraryVendor[]) {
  return new Set(vendors.map((v) => v.category ?? UNCATEGORIZED_KEY)).size;
}

function summaryLine({
  visibleCount,
  totalCount,
  preferredCount,
  categoryCount,
  isNarrowed,
}: {
  visibleCount: number;
  totalCount: number;
  preferredCount: number;
  categoryCount: number;
  isNarrowed: boolean;
}) {
  const vendorWord = visibleCount === 1 ? "vendor" : "vendors";
  const categoryWord = categoryCount === 1 ? "category" : "categories";

  if (isNarrowed && visibleCount !== totalCount) {
    return `${visibleCount} of ${totalCount} ${vendorWord} · ${preferredCount} preferred`;
  }

  return `${visibleCount} ${vendorWord} · ${preferredCount} preferred · ${categoryCount} ${categoryWord}`;
}

/** ACCENT-01a bottom berry bar — same after: technique as project workspace nav. */
const categoryPillClass = (active: boolean) =>
  cn(
    "relative flex shrink-0 items-center gap-1.5 rounded-[var(--radius-pill)] bg-well px-3.5 py-2 text-[13px] font-semibold text-muted transition-[color,background,box-shadow,padding] duration-150",
    "after:absolute after:inset-x-3.5 after:bottom-0 after:h-[2px] after:origin-left after:scale-x-0 after:rounded-t-[2px] after:bg-accent after:transition-transform after:duration-150",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    active &&
      "bg-surface pb-2.5 text-ink shadow-raised after:scale-x-100",
  );

function CategoryFilterRail({
  pills,
  activeKey,
  onSelect,
}: {
  pills: { key: string; label: string; count: number }[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter by category"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeKey === ALL_CATEGORIES}
        className={categoryPillClass(activeKey === ALL_CATEGORIES)}
        onClick={() => onSelect(ALL_CATEGORIES)}
      >
        All categories
      </button>
      {pills.map((pill) => (
        <button
          key={pill.key}
          type="button"
          role="tab"
          aria-selected={activeKey === pill.key}
          className={categoryPillClass(activeKey === pill.key)}
          onClick={() => onSelect(pill.key)}
        >
          {pill.label}
          <span
            className={cn(
              "rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[11.5px] font-bold tabular-nums",
              activeKey === pill.key
                ? "bg-accent-wash text-accent"
                : "bg-ink/10 text-muted",
            )}
          >
            {pill.count}
          </span>
        </button>
      ))}
    </div>
  );
}

export function VendorLibrary({ vendors }: { vendors: LibraryVendor[] }) {
  const [preferredOnly, setPreferredOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryKey, setCategoryKey] = useState(ALL_CATEGORIES);
  const [sort, setSort] = useState<SortKey>("preferred");

  const searchQuery = search.trim();

  const preferredFiltered = useMemo(
    () => (preferredOnly ? vendors.filter((v) => v.is_preferred) : vendors),
    [vendors, preferredOnly],
  );

  const searchFiltered = useMemo(
    () => preferredFiltered.filter((v) => matchesSearch(v, searchQuery)),
    [preferredFiltered, searchQuery],
  );

  const railPills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const vendor of searchFiltered) {
      const key = vendor.category ?? UNCATEGORIZED_KEY;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const known = VENDOR_CATEGORIES.flatMap((cat) => {
      const count = counts.get(cat.id) ?? 0;
      if (count === 0) return [];
      return [{ key: cat.id, label: cat.label, count }];
    });

    // Legacy free-text categories (not in VENDOR_CATEGORIES), after canonical order.
    for (const [key, count] of counts) {
      if (key === UNCATEGORIZED_KEY) continue;
      if (KNOWN_ORDER.includes(key)) continue;
      known.push({
        key,
        label: vendorCategoryLabel(key),
        count,
      });
    }

    const uncategorizedCount = counts.get(UNCATEGORIZED_KEY) ?? 0;
    if (uncategorizedCount > 0) {
      known.push({
        key: UNCATEGORIZED_KEY,
        label: "Uncategorized",
        count: uncategorizedCount,
      });
    }

    return known;
  }, [searchFiltered]);

  const resolvedCategoryKey =
    categoryKey === ALL_CATEGORIES ||
    railPills.some((pill) => pill.key === categoryKey)
      ? categoryKey
      : ALL_CATEGORIES;

  /**
   * Checkpoint #4: search matches persist regardless of the active category pill.
   * When a search query is present, category filtering is skipped for visibility.
   */
  const visibleVendors = useMemo(() => {
    const filtered =
      !searchQuery && resolvedCategoryKey !== ALL_CATEGORIES
        ? searchFiltered.filter(
            (v) => (v.category ?? UNCATEGORIZED_KEY) === resolvedCategoryKey,
          )
        : searchFiltered;
    return sortVendors(filtered, sort);
  }, [searchFiltered, resolvedCategoryKey, searchQuery, sort]);

  if (vendors.length === 0) {
    return (
      <EmptyState>
        No vendors yet — add your first preferred vendor.
      </EmptyState>
    );
  }

  const isNarrowed =
    preferredOnly ||
    Boolean(searchQuery) ||
    resolvedCategoryKey !== ALL_CATEGORIES;

  const preferredCount = visibleVendors.filter((v) => v.is_preferred).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <label className="flex min-w-[220px] max-w-[340px] flex-1 items-center gap-2 rounded-[var(--radius-pill)] bg-well px-4 py-2.5 shadow-recessed">
          <svg
            aria-hidden
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="shrink-0 text-muted"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="sr-only">Search vendors</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors or Instagram…"
            className="w-full border-none bg-transparent text-[14px] font-medium text-ink outline-none placeholder:text-muted"
          />
        </label>

        <div
          role="group"
          aria-label="Preferred filter"
          className="flex rounded-[var(--radius-pill)] bg-well p-[3px] shadow-recessed"
        >
          <button
            type="button"
            onClick={() => setPreferredOnly(false)}
            aria-pressed={!preferredOnly}
            className={cn(
              "rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              !preferredOnly
                ? "bg-surface text-ink shadow-raised"
                : "text-muted hover:text-ink",
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setPreferredOnly(true)}
            aria-pressed={preferredOnly}
            className={cn(
              "rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage",
              preferredOnly
                ? "bg-surface text-sage shadow-raised"
                : "text-muted hover:text-sage",
            )}
          >
            Preferred only
          </button>
        </div>

        <label className="ml-auto flex min-w-[11rem] items-center gap-2">
          <span className="sr-only">Sort vendors</span>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort vendors"
            className="w-auto min-w-[11rem] py-2 text-[13px]"
          >
            <option value="preferred">Preferred first</option>
            <option value="name">Name A–Z</option>
            <option value="linked">Most linked</option>
          </Select>
        </label>
      </div>

      <CategoryFilterRail
        pills={railPills}
        activeKey={resolvedCategoryKey}
        onSelect={setCategoryKey}
      />

      {visibleVendors.length === 0 ? (
        <EmptyState>
          {preferredOnly && !searchQuery && resolvedCategoryKey === ALL_CATEGORIES
            ? "No preferred vendors yet."
            : "No vendors match this filter."}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] font-medium tabular-nums text-muted">
            {summaryLine({
              visibleCount: visibleVendors.length,
              totalCount: vendors.length,
              preferredCount,
              categoryCount: uniqueCategoryCount(visibleVendors),
              isNarrowed,
            })}
          </p>

          <Card className="overflow-hidden p-0">
            <div className="p-3 sm:p-4">
              <div
                className={cn(
                  "mb-2 hidden border-b border-hairline px-4 py-3 lg:grid lg:gap-4",
                  DIRECTORY_COLS,
                )}
              >
                <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                  Vendor
                </span>
                <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                  Category
                </span>
                <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                  Contact
                </span>
                <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                  Instagram
                </span>
                <span
                  className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted"
                  title="Weddings this vendor is linked to"
                >
                  Linked
                </span>
                <span className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted lg:justify-self-end">
                  Preferred
                </span>
              </div>
              <ul className="list-none">
                {visibleVendors.map((vendor) => (
                  <VendorDirectoryRow key={vendor.id} vendor={vendor} />
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
