/**
 * App origin for absolute links (invites, vendor confirm, etc.).
 * Client: the page the user is on (`window.location.origin`) so copy-link
 * controls match invite copy and never invent localhost.
 * Server: NEXT_PUBLIC_SITE_URL, then Vercel, then localhost.
 * Not the INQUIRY-EMBED production hardcode — that is embed-only.
 *
 * Safe for client and server (no secrets). Keep free of `server-only`.
 */
export function appOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
