export type PublicRegistryItem = {
  id: string;
  name: string;
  price: number | null;
  imageUrl: string | null;
  buyUrl: string | null;
  quantityWanted: number;
  note: string | null;
  claimedQty: number;
};

export type ExternalRegistryLink = {
  label: string;
  url: string;
};

export function parseExternalRegistryLinks(
  value: unknown,
): ExternalRegistryLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const url = typeof row.url === "string" ? row.url.trim() : "";
      if (!label || !url) return null;
      return { label, url };
    })
    .filter((item): item is ExternalRegistryLink => item !== null);
}
