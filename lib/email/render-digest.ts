import { BRAND_ACCENT_HEX, DEFAULT_BRAND_NAME } from "@/lib/branding/types";

/** Production-absolute First Look wordmark — same posture as INQUIRY-EMBED-01. */
export const FIRST_LOOK_EMAIL_LOGO_URL =
  "https://www.usefirstlook.app/email/firstlook-logo.png";

/** Soft stack literals (globals.css) — email cannot use CSS vars. */
const FL = {
  accent: "#C0396B",
  surface: "#FFFFFF",
  canvas: "#F3EEF0",
  ink: "#241C20",
  muted: "#857A80",
  hairline: "#EFE7EB",
  well: "#F7F3F5",
} as const;

export type DigestBranding = {
  brandName?: string | null;
  brandLogoUrl?: string | null;
  brandAccentColor?: string | null;
};

export type DigestSection = {
  projectName: string;
  summary: string;
  highlights: string[];
};

export type RenderBrandedDigestEmailInput = {
  title: string;
  sections: DigestSection[];
  branding?: DigestBranding;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resolveBranding(branding?: DigestBranding): {
  brandName: string;
  brandLogoUrl: string;
  brandAccentColor: string;
} {
  const accent =
    branding?.brandAccentColor &&
    BRAND_ACCENT_HEX.test(branding.brandAccentColor)
      ? branding.brandAccentColor
      : FL.accent;

  const brandName = branding?.brandName?.trim() || DEFAULT_BRAND_NAME;
  const brandLogoUrl =
    branding?.brandLogoUrl?.trim() || FIRST_LOOK_EMAIL_LOGO_URL;

  return { brandName, brandLogoUrl, brandAccentColor: accent };
}

/**
 * Reusable branded HTML digest shell (EMAIL-BRAND-01).
 * Inline styles only — no &lt;style&gt; block, CSS vars, or Tailwind.
 * Branding is optional and field-by-field; missing fields fall back to First Look.
 */
export function renderBrandedDigestEmail(
  input: RenderBrandedDigestEmailInput,
): string {
  const { brandName, brandLogoUrl, brandAccentColor } = resolveBranding(
    input.branding,
  );

  const sectionHtml = input.sections
    .map((section) => {
      const highlights =
        section.highlights.length > 0
          ? `<ul style="margin:12px 0 0;padding:0 0 0 20px;color:${FL.ink};font-size:15px;line-height:1.5;">${section.highlights
              .map(
                (item) =>
                  `<li style="margin:0 0 8px;color:${FL.ink};">${escapeHtml(item)}</li>`,
              )
              .join("")}</ul>`
          : "";

      return `<tr>
  <td style="padding:0 0 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${FL.surface};border-radius:14px;border:1px solid ${FL.hairline};">
      <tr>
        <td style="padding:20px 22px;">
          <p style="margin:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.02em;color:${FL.ink};">${escapeHtml(section.projectName)}</p>
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:400;line-height:1.55;color:${FL.ink};">${escapeHtml(section.summary)}</p>
          ${highlights}
        </td>
      </tr>
    </table>
  </td>
</tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${FL.canvas};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${FL.canvas};">
  <tr>
    <td align="center" style="padding:28px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;">
        <tr>
          <td style="background-color:${FL.surface};border-radius:16px;overflow:hidden;border:1px solid ${FL.hairline};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="height:4px;line-height:4px;font-size:0;background-color:${brandAccentColor};">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:22px 24px 8px;background-color:${FL.surface};">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="vertical-align:middle;padding:0 12px 0 0;">
                        <img src="${escapeHtml(brandLogoUrl)}" alt="${escapeHtml(brandName)}" width="160" height="37" style="display:block;width:160px;height:auto;border:0;outline:none;text-decoration:none;">
                      </td>
                      <td style="vertical-align:middle;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:${FL.ink};">${escapeHtml(brandName)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 24px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${FL.ink};">
                  ${escapeHtml(input.title)}
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 8px;background-color:${FL.well};">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-top:16px;">
                    ${sectionHtml}
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 24px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.4;color:${FL.muted};">
                  You're receiving this as a weekly project digest.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
