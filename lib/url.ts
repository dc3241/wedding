/**
 * App origin for absolute links (invites, vendor confirm, etc.).
 * Prefer NEXT_PUBLIC_SITE_URL; fall back to Vercel / localhost.
 * Not the INQUIRY-EMBED production hardcode — that is embed-only.
 *
 * Safe for client and server (no secrets). Keep free of `server-only`.
 */
export function appOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
