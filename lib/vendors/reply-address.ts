import { extractEmailAddress, inquiryInboundDomain } from "@/lib/inquiry/parse";

/**
 * AGENTIC-03 — per-vendor reply-to address: v-{confirm_token}@{inbound domain}.
 * confirm_token is the standing 32-hex token on project_vendors (AUTO-02), so
 * no new secret. The local part can never collide with an inquiry slug
 * because slugs are checked after this and "v-<32 hex>" is routed here first.
 */
const LOCAL_RE = /^v-([0-9a-f]{32})$/;

/** Null when the inbound domain isn't configured (replies stay in Gmail). */
export function vendorReplyAddress(confirmToken: string | null): string | null {
  const domain = inquiryInboundDomain();
  const token = confirmToken?.trim().toLowerCase();
  if (!domain || !token || !/^[0-9a-f]{32}$/.test(token)) return null;
  return `v-${token}@${domain}`;
}

export function vendorTokenFromRecipients(
  addresses: string[],
  domain: string,
): string | null {
  const host = domain.trim().toLowerCase();
  for (const raw of addresses) {
    const email = extractEmailAddress(raw);
    if (!email) continue;
    const at = email.lastIndexOf("@");
    if (at <= 0 || email.slice(at + 1) !== host) continue;
    const match = LOCAL_RE.exec(email.slice(0, at));
    if (match) return match[1]!;
  }
  return null;
}
