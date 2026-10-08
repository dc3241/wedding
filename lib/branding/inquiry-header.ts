import {
  accentFailsWhiteContrast,
  sidebarFailsNavTextContrast,
} from "@/lib/branding/contrast";
import {
  BRAND_ACCENT_HEX,
  BRAND_SIDEBAR_NAV_TEXT,
  type ProjectBranding,
} from "@/lib/branding/types";

export type InquiryHeaderTheme = {
  background: string;
  /** Light copy on a dark fill, or dark copy on a light fill. */
  tone: "light" | "dark";
};

/**
 * Public inquiry hero fill.
 * Sidebar color wins when a venue has set one (large dark brand field).
 * Otherwise the accent colors the hero — the same hex the button already uses.
 */
export function inquiryHeaderTheme(
  branding: ProjectBranding | null | undefined,
): InquiryHeaderTheme | null {
  if (!branding) return null;

  const sidebar = branding.brandSidebarColor?.trim() ?? "";
  if (BRAND_ACCENT_HEX.test(sidebar)) {
    return {
      background: sidebar,
      tone: sidebarFailsNavTextContrast(sidebar, BRAND_SIDEBAR_NAV_TEXT)
        ? "dark"
        : "light",
    };
  }

  const accent = branding.brandAccentColor?.trim() ?? "";
  if (BRAND_ACCENT_HEX.test(accent)) {
    return {
      background: accent,
      tone: accentFailsWhiteContrast(accent) ? "dark" : "light",
    };
  }

  return null;
}
