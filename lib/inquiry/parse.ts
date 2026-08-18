import "server-only";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyInquiryName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "inquiry";
}

export function isInquirySlug(value: string): boolean {
  return SLUG_RE.test(value);
}

export function parseFromHeader(from: string): {
  name: string;
  email: string | null;
} {
  const trimmed = from.trim();
  const angled = trimmed.match(/^(.*)<([^>]+)>\s*$/);
  if (angled) {
    const email = angled[2].trim();
    const rawName = angled[1].trim().replace(/^"|"$/g, "");
    return {
      name: rawName || email.split("@")[0] || "Inquiry",
      email: email.includes("@") ? email : null,
    };
  }
  if (trimmed.includes("@")) {
    return {
      name: trimmed.split("@")[0] || "Inquiry",
      email: trimmed,
    };
  }
  return { name: trimmed || "Inquiry", email: null };
}

export function extractEmailAddress(value: string): string | null {
  const trimmed = value.trim();
  const angled = trimmed.match(/<([^>]+)>/);
  const email = (angled?.[1] ?? trimmed).trim().toLowerCase();
  if (!email.includes("@")) return null;
  return email;
}

export function slugFromRecipientAddresses(
  addresses: string[],
  inboundDomain: string,
): string | null {
  const host = inboundDomain.trim().toLowerCase();
  if (!host) return null;

  for (const raw of addresses) {
    const email = extractEmailAddress(raw);
    if (!email) continue;
    const at = email.lastIndexOf("@");
    if (at <= 0) continue;
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (domain === host && isInquirySlug(local)) {
      return local;
    }
  }
  return null;
}

export function inquiryInboundDomain(): string | null {
  const value = process.env.INQUIRY_INBOUND_DOMAIN?.trim().toLowerCase();
  return value || null;
}
