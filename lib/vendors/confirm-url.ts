/**
 * Standing vendor-confirm URL for AUTO-02 / VND-16.
 * Single source for the countdown cron and the booked-card copy control.
 * Origin resolution is the former inline helper from the cron route.
 */
function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function vendorConfirmUrl(token: string): string {
  return `${appOrigin()}/vendor-confirm/${encodeURIComponent(token)}`;
}
