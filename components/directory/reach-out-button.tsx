import { cn } from "@/lib/cn";
import { buttonVariantClasses } from "@/components/ui/button";
import { reachOutPath } from "@/lib/directory/reach-out";

/**
 * Plain anchor, never <Link>: /reach-out/[slug] is a route handler that adds a
 * venue to the signed-in couple's project, so it must not be prefetched.
 */
export function ReachOutButton({
  slug,
  variant = "primary",
  className,
  children = "Reach out",
}: {
  slug: string;
  variant?: "primary" | "default";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={reachOutPath(slug)}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] px-5 py-2.5 text-[14px] font-semibold no-underline transition-colors duration-150",
        buttonVariantClasses[variant],
        className,
      )}
    >
      {children}
    </a>
  );
}
