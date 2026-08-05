"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Shared chevron collapse affordance (▾ + rotate-180 + aria-expanded).
 * Extracted from the inline pattern used by VendorLibrary, urgent-by-wedding,
 * and WebsiteEditor — those call sites are not migrated in this slice.
 */
export function CollapseSection({
  title,
  children,
  defaultOpen = true,
  className,
  headerClassName,
  bodyClassName,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent",
          headerClassName,
        )}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="min-w-0 flex-1">{title}</span>
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

      {open ? <div className={bodyClassName}>{children}</div> : null}
    </div>
  );
}
