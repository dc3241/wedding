import { CoupleShellNav } from "@/components/couple/couple-shell-nav";
import { Wordmark } from "@/components/ui/topbar";
import {
  BRAND_ACCENT_HEX,
  DEFAULT_BRAND_NAME,
  type ProjectBranding,
} from "@/lib/branding/types";
import type { CSSProperties, ReactNode } from "react";

function BrandMark({ branding }: { branding: ProjectBranding }) {
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

export function CoupleShell({
  children,
  branding = null,
}: {
  children: ReactNode;
  branding?: ProjectBranding | null;
}) {
  const accent =
    branding?.brandAccentColor &&
    BRAND_ACCENT_HEX.test(branding.brandAccentColor)
      ? branding.brandAccentColor
      : null;

  const style = accent
    ? ({ ["--accent"]: accent } as CSSProperties)
    : undefined;

  return (
    <div className="flex min-h-full flex-col bg-canvas" style={style}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-canvas px-6 py-[18px]">
        {branding ? <BrandMark branding={branding} /> : <Wordmark />}
        <CoupleShellNav />
      </header>
      <main className="flex min-h-full flex-1 flex-col">{children}</main>
    </div>
  );
}
