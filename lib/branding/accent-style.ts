import type { CSSProperties } from "react";
import {
  BRAND_ACCENT_HEX,
  DEFAULT_BRAND_SIDEBAR_COLOR,
  type ProjectBranding,
} from "@/lib/branding/types";

/**
 * Inline chrome overrides for CoupleShell / venue PlannerShell.
 * `--accent` from brand accent; `--brand-sidebar` for the dark rail
 * (PlannerShell only — couples ignore it).
 */
export function brandAccentStyle(
  branding: ProjectBranding | null | undefined,
): CSSProperties | undefined {
  const accent =
    branding?.brandAccentColor &&
    BRAND_ACCENT_HEX.test(branding.brandAccentColor)
      ? branding.brandAccentColor
      : null;

  const sidebar =
    branding?.brandSidebarColor &&
    BRAND_ACCENT_HEX.test(branding.brandSidebarColor)
      ? branding.brandSidebarColor
      : null;

  if (!accent && !sidebar) return undefined;

  const style: Record<string, string> = {};
  if (accent) style["--accent"] = accent;
  if (sidebar) style["--brand-sidebar"] = sidebar;
  return style as CSSProperties;
}

/** Resolved rail fill for previews — branded or Soft stack ink. */
export function resolveBrandSidebarColor(
  branding: ProjectBranding | null | undefined,
): string {
  const sidebar = branding?.brandSidebarColor?.trim();
  if (sidebar && BRAND_ACCENT_HEX.test(sidebar)) return sidebar;
  return DEFAULT_BRAND_SIDEBAR_COLOR;
}
