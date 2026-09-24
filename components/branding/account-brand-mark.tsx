import { Wordmark } from "@/components/ui/topbar";
import { DEFAULT_BRAND_NAME, type ProjectBranding } from "@/lib/branding/types";
import { cn } from "@/lib/cn";

/** White-label nav mark. Logo → image; missing logo → First Look Wordmark. */
export function AccountBrandMark({
  branding,
  onDark = false,
  className,
}: {
  branding: ProjectBranding;
  /** Light plate behind logo + canvas text for dark rails (admin-style chrome). */
  onDark?: boolean;
  className?: string;
}) {
  const name = branding.brandName?.trim() || DEFAULT_BRAND_NAME;
  const brandName = branding.brandName?.trim() || null;
  const logoUrl = branding.brandLogoUrl?.trim() || null;

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- public brand-media URL
        <img
          src={logoUrl}
          alt={name}
          className={cn(
            "w-auto object-contain",
            onDark
              ? "h-9 max-w-[168px] rounded-[10px] bg-surface px-2.5 py-1.5 shadow-[0_1px_2px_rgba(60,30,45,0.06)]"
              : "h-7 max-w-[180px]",
          )}
        />
      ) : onDark && brandName ? (
        <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-canvas">
          {brandName}
        </span>
      ) : (
        <Wordmark className={onDark ? "h-[19px] w-auto text-canvas" : undefined} />
      )}
      {/* Light chrome: name beside logo. Dark rail: logo-or-name only (no double mark). */}
      {!onDark && brandName ? (
        <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {brandName}
        </span>
      ) : null}
    </div>
  );
}
