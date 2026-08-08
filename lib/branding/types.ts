export type ProjectBranding = {
  brandName: string | null;
  brandLogoUrl: string | null;
  brandAccentColor: string | null;
};

export const BRAND_ACCENT_HEX = /^#[0-9a-fA-F]{6}$/;
export const BRAND_NAME_MAX_LENGTH = 60;
export const DEFAULT_BRAND_NAME = "First Look";
