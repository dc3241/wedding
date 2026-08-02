"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { VendorLibraryRow } from "@/components/vendors/VendorLibraryRow";
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
  linkCount: number;
};

const UNCATEGORIZED_KEY = "__uncategorized__";
const KNOWN_ORDER = VENDOR_CATEGORIES.map((c) => c.id);

function sortWithinGroup(a: LibraryVendor, b: LibraryVendor) {
  if (a.is_preferred !== b.is_preferred) {
    return a.is_preferred ? -1 : 1;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
}

function groupVendors(vendors: LibraryVendor[]) {
  const byKey = new Map<string, LibraryVendor[]>();

  for (const vendor of vendors) {
    const key = vendor.category ?? UNCATEGORIZED_KEY;
    const list = byKey.get(key) ?? [];
    list.push(vendor);
    byKey.set(key, list);
  }

  for (const list of byKey.values()) {
    list.sort(sortWithinGroup);
  }

  const keys = [...byKey.keys()].sort((a, b) => {
    if (a === UNCATEGORIZED_KEY) return 1;
    if (b === UNCATEGORIZED_KEY) return -1;
    const ai = KNOWN_ORDER.indexOf(a);
    const bi = KNOWN_ORDER.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return vendorCategoryLabel(a).localeCompare(vendorCategoryLabel(b), undefined, {
      sensitivity: "base",
    });
  });

  return keys.map((key) => ({
    key,
    label:
      key === UNCATEGORIZED_KEY ? "Uncategorized" : vendorCategoryLabel(key),
    vendors: byKey.get(key) ?? [],
  }));
}

function CategoryGroupCard({
  label,
  vendors,
}: {
  label: string;
  vendors: LibraryVendor[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface shadow-raised">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            {label}
          </span>
          <Pill>{vendors.length}</Pill>
        </div>
        <span
          aria-hidden
          className={cn(
            "shrink-0 text-[13px] text-muted transition-transform",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div className="flex flex-col gap-2.5 px-3.5 pb-3.5">
          {vendors.map((vendor) => (
            <VendorLibraryRow key={vendor.id} vendor={vendor} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function VendorLibrary({ vendors }: { vendors: LibraryVendor[] }) {
  const [preferredOnly, setPreferredOnly] = useState(false);

  const filtered = useMemo(
    () => (preferredOnly ? vendors.filter((v) => v.is_preferred) : vendors),
    [vendors, preferredOnly],
  );
  const groups = useMemo(() => groupVendors(filtered), [filtered]);

  if (vendors.length === 0) {
    return (
      <EmptyState>
        No vendors yet — add your first preferred vendor.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPreferredOnly(false)}
          aria-pressed={!preferredOnly}
          className={cn(
            "rounded-[var(--radius-pill)] px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            !preferredOnly
              ? "bg-well text-ink shadow-recessed"
              : "text-muted hover:bg-well hover:text-ink",
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
              ? "bg-well text-sage shadow-recessed"
              : "text-muted hover:bg-well hover:text-sage",
          )}
        >
          Preferred only
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No preferred vendors yet.</EmptyState>
      ) : (
        groups.map((group) => (
          <CategoryGroupCard
            key={group.key}
            label={group.label}
            vendors={group.vendors}
          />
        ))
      )}
    </div>
  );
}
