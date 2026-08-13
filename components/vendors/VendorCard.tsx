"use client";

import Link from "next/link";
import { formatInstagramLink } from "@/components/vendors/VendorLibraryDetail";
import type { LibraryVendor } from "@/components/vendors/VendorLibrary";
import { cn } from "@/lib/cn";
import { vendorCategoryLabel } from "@/lib/vendor-categories";

function vendorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export function VendorCard({ vendor }: { vendor: LibraryVendor }) {
  const instagram = formatInstagramLink(vendor.instagram);
  const categoryLabel = vendor.category
    ? vendorCategoryLabel(vendor.category)
    : "Uncategorized";

  return (
    <Link
      href={`/vendors/${vendor.id}`}
      className={cn(
        "group flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface p-[18px] shadow-raised no-underline",
        "transition-transform duration-150 hover:-translate-y-px",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          aria-hidden
          className="flex size-[46px] shrink-0 items-center justify-center rounded-[var(--radius-inner)] bg-well text-[15px] font-bold text-ink"
        >
          {vendorInitials(vendor.name)}
        </div>
        {vendor.is_preferred ? (
          <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-sage-wash px-2.5 py-1 text-[11px] font-bold text-sage">
            ★ Preferred
          </span>
        ) : null}
      </div>

      <div className="min-w-0">
        <p className="text-[15px] font-bold leading-snug tracking-[-0.01em] text-ink">
          {vendor.name}
        </p>
        {instagram ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-muted">
            <svg
              aria-hidden
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 opacity-60"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" />
            </svg>
            <span className="truncate">{instagram.label}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-hairline pt-2.5">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.02em] text-muted">
          {categoryLabel}
        </span>
        <span className="text-[12.5px] font-semibold text-muted transition-colors group-hover:text-accent">
          View →
        </span>
      </div>
    </Link>
  );
}
