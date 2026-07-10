import { cn } from "@/lib/cn";
import Link from "next/link";

export type FeatureRowItem = {
  label: string;
  href?: string;
};

type FeatureRowProps = {
  items: FeatureRowItem[];
  className?: string;
};

export function FeatureRow({ items, className }: FeatureRowProps) {
  return (
    <nav
      aria-label="Features"
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-2",
        className,
      )}
    >
      {items.map((item, index) => (
        <span key={item.label} className="inline-flex items-center gap-3">
          {index > 0 ? (
            <span
              className="size-1 shrink-0 rounded-full bg-stone"
              aria-hidden
            />
          ) : null}
          {item.href ? (
            <Link
              href={item.href}
              className="text-eyebrow-emotional transition-colors hover:text-plum-deep"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-eyebrow-emotional">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
