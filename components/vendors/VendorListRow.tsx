import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type VendorListRowProps = {
  name: string;
  category?: string | null;
  href?: string;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function VendorListRow({
  name,
  category,
  href,
  meta,
  leading,
  trailing,
  footer,
  className,
}: VendorListRowProps) {
  const nameClass = href
    ? "text-[15px] text-ink hover:text-plum-deep"
    : "text-[15px] text-ink";

  return (
    <div className={cn("px-1 py-3.5", className)}>
      <div className="flex items-center justify-between gap-4">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1">
          {href ? (
            <Link href={href} className={nameClass}>
              {name}
            </Link>
          ) : (
            <div className={nameClass}>{name}</div>
          )}
          {category ? (
            <div className="mt-px text-[13px] text-ink-muted">{category}</div>
          ) : null}
          {meta ? (
            <div className="mt-px text-[13px] text-ink-muted">{meta}</div>
          ) : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {footer ? <div className="mt-3 pl-0">{footer}</div> : null}
    </div>
  );
}
