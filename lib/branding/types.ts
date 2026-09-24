export type ProjectBranding = {
  brandName: string | null;
  brandLogoUrl: string | null;
  brandAccentColor: string | null;
  /** Venue own-shell rail only. Null elsewhere / when unset → Soft stack ink. */
  brandSidebarColor?: string | null;
};

export const BRAND_ACCENT_HEX = /^#[0-9a-fA-F]{6}$/;
export const BRAND_NAME_MAX_LENGTH = 60;
export const DEFAULT_BRAND_NAME = "First Look";
/** Soft stack `--ink` — default PlannerShell rail when no brand sidebar set. */
export const DEFAULT_BRAND_SIDEBAR_COLOR = "#241C20";
/** Active / primary light nav text on the dark rail (canvas). */
export const BRAND_SIDEBAR_NAV_TEXT = "#F3EEF0";
