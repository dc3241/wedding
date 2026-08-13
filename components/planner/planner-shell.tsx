import { PlannerProjectSidebar } from "@/components/planner/planner-project-sidebar";
import type { SidebarProject } from "@/components/planner/planner-project-sidebar";
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

export function PlannerShell({
  children,
  projects,
  branding = null,
}: {
  children: ReactNode;
  projects: SidebarProject[];
  branding?: ProjectBranding | null;
}) {
  // Same --accent override mechanism as CoupleShell (inline CSS var).
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
      <header className="sticky top-0 z-10 flex items-center border-b border-hairline bg-canvas px-8 py-[18px]">
        {branding ? <BrandMark branding={branding} /> : <Wordmark />}
      </header>
      <div className="flex flex-1 gap-6 px-8 py-7">
        <PlannerProjectSidebar projects={projects} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
