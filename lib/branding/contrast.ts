import { BRAND_ACCENT_HEX } from "@/lib/branding/types";

/** WCAG 2.1 AA for normal text — accent is used as text and behind white labels. */
export const BRAND_ACCENT_MIN_CONTRAST = 4.5;

function srgbChannel(value: number): number {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a #RRGGBB hex, or null if the string is not a 6-digit hex. */
export function relativeLuminance(hex: string): number | null {
  if (!BRAND_ACCENT_HEX.test(hex)) return null;
  const n = Number.parseInt(hex.slice(1), 16);
  const r = srgbChannel((n >> 16) & 255);
  const g = srgbChannel((n >> 8) & 255);
  const b = srgbChannel(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio of hex against white (luminance 1). */
export function contrastAgainstWhite(hex: string): number | null {
  const luminance = relativeLuminance(hex);
  if (luminance == null) return null;
  return 1.05 / (luminance + 0.05);
}

export function accentFailsWhiteContrast(hex: string): boolean {
  const ratio = contrastAgainstWhite(hex);
  return ratio != null && ratio < BRAND_ACCENT_MIN_CONTRAST;
}
