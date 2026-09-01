"use client";

import Link from "next/link";
import { Pill } from "@/components/ui/pill";
import { formatInstagramLink } from "@/components/vendors/VendorLibraryDetail";
import { cn } from "@/lib/cn";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

type DirectoryVendor = {
  id: string;
  name: string;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_preferred: boolean;
  instagram: string | null;
  linkCount: number;
};

/** Shared so header and rows keep identical track widths. */
export const DIRECTORY_COLS =
  "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_4.25rem_minmax(5.5rem,auto)]";

function vendorContact(vendor: DirectoryVendor) {
  return vendor.contact_email || vendor.contact_phone || vendor.contact_name;
}

function linkedLabel(count: number) {
  return count === 1 ? "1 wedding" : `${count} weddings`;
}

function PreferredPill() {
  return (
    <Pill variant="sage" className="bg-sage-wash">
      Preferred
    </Pill>
  );
}

export function VendorDirectoryRow({ vendor }: { vendor: DirectoryVendor }) {
  const instagram = formatInstagramLink(vendor.instagram);
  const categoryLabel = vendor.category
    ? vendorCategoryLabel(vendor.category)
    : "Uncategorized";
  const contact = vendorContact(vendor);

  return (
    <li className="mb-2 last:mb-0">
      <Link
        href={`/vendors/${vendor.id}`}
        className={cn(
          "block rounded-[var(--radius-inner)] bg-well px-4 py-3.5 shadow-recessed no-underline",
          "transition-colors duration-150 hover:bg-canvas",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "motion-reduce:transition-none",
          "lg:grid lg:items-center lg:gap-4",
          DIRECTORY_COLS,
        )}
      >
        <div className="flex items-start justify-between gap-3 lg:block">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-ink">
              {vendor.name}
            </p>
            <p className="mt-1 truncate text-[13px] text-muted lg:hidden">
              {categoryLabel}
              {contact ? (
                <>
                  <span className="mx-1.5">·</span>
                  {contact}
                </>
              ) : null}
              {vendor.linkCount > 0 ? (
                <>
                  <span className="mx-1.5">·</span>
                  <span className="tabular-nums">{linkedLabel(vendor.linkCount)}</span>
                </>
              ) : null}
            </p>
          </div>
          {vendor.is_preferred ? (
            <span className="shrink-0 lg:hidden">
              <PreferredPill />
            </span>
          ) : null}
        </div>
        <p className="hidden truncate text-[14px] text-muted lg:block">
          {categoryLabel}
        </p>
        <p className="hidden truncate text-[14px] text-muted lg:block">
          {contact ?? "—"}
        </p>
        <p className="hidden truncate text-[14px] text-muted lg:block">
          {instagram?.label ?? "—"}
        </p>
        <p
          className="hidden tabular-nums text-[14px] text-muted lg:block"
          title={vendor.linkCount > 0 ? linkedLabel(vendor.linkCount) : undefined}
        >
          {vendor.linkCount > 0 ? vendor.linkCount : "—"}
        </p>
        <div className="hidden lg:block lg:justify-self-end">
          {vendor.is_preferred ? (
            <PreferredPill />
          ) : (
            <span className="text-[14px] text-muted">—</span>
          )}
        </div>
      </Link>
    </li>
  );
}
