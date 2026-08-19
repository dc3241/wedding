import { Wordmark } from "@/components/ui/topbar";
import { DEFAULT_BRAND_NAME, type ProjectBranding } from "@/lib/branding/types";

/** White-label nav mark. Logo → image; missing logo → First Look Wordmark. */
export function AccountBrandMark({ branding }: { branding: ProjectBranding }) {
  const name = branding.brandName?.trim() || DEFAULT_BRAND_NAME;

  return (
    <div className="flex min-w-0 items-center gap-3">
      {branding.brandLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- public brand-media URL
        <img
          src={branding.brandLogoUrl}
          alt={name}
          className="h-7 w-auto max-w-[180px] object-contain"
        />
      ) : (
        <Wordmark />
      )}
      {branding.brandName?.trim() ? (
        <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {branding.brandName.trim()}
        </span>
      ) : null}
    </div>
  );
}
