export type VendorShareMessageAuthor = "owner" | "vendor";

export type VendorShareMessage = {
  id: string;
  author: VendorShareMessageAuthor;
  body: string;
  created_at: string;
};

export const VENDOR_SHARE_MESSAGE_MAX = 4000;

export function parseVendorShareMessage(value: unknown): VendorShareMessage | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  if (row.author !== "owner" && row.author !== "vendor") return null;
  if (typeof row.body !== "string" || !row.body.trim()) return null;
  if (typeof row.created_at !== "string") return null;
  return {
    id: row.id,
    author: row.author,
    body: row.body,
    created_at: row.created_at,
  };
}

export function parseVendorShareMessages(value: unknown): VendorShareMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const parsed = parseVendorShareMessage(row);
    return parsed ? [parsed] : [];
  });
}

export function ownerUnreadCount(
  messages: VendorShareMessage[],
  lastReadAt: string | null,
): number {
  const lastReadMs = lastReadAt ? Date.parse(lastReadAt) : Number.NaN;
  return messages.filter((message) => {
    if (message.author !== "vendor") return false;
    if (!Number.isFinite(lastReadMs)) return true;
    const createdMs = Date.parse(message.created_at);
    return Number.isFinite(createdMs) && createdMs > lastReadMs;
  }).length;
}
