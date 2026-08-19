import type { CSSProperties } from "react";
import { BRAND_ACCENT_HEX, type ProjectBranding } from "@/lib/branding/types";

/** Inline `--accent` override used by CoupleShell / venue PlannerShell. */
export function brandAccentStyle(
  branding: ProjectBranding | null | undefined,
): CSSProperties | undefined {
  const accent =
    branding?.brandAccentColor &&
    BRAND_ACCENT_HEX.test(branding.brandAccentColor)
      ? branding.brandAccentColor
      : null;

  return accent
    ? ({ ["--accent"]: accent } as CSSProperties)
    : undefined;
}
