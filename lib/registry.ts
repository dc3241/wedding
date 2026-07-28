/** Derive a tidy store label from a buy URL hostname (e.g. amazon.com → Amazon). */
export function storeLabelFromUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const hostname = new URL(withProtocol).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
    if (!hostname) return null;

    const label = hostname.split(".")[0];
    if (!label) return null;

    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return null;
  }
}

export type RegistryItemPreview = {
  name?: string;
  imageUrl?: string;
  price?: number;
};

export function normalizeProductUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .trim();
}

function metaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return null;
}

function parsePrice(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const text = String(raw).replace(/[^0-9.]/g, "");
  if (!text) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function typeIncludesProduct(type: unknown): boolean {
  if (typeof type === "string") {
    return /(^|\/)Product$/i.test(type) || type.toLowerCase() === "product";
  }
  if (Array.isArray(type)) {
    return type.some((t) => typeIncludesProduct(t));
  }
  return false;
}

function imageFromJsonLd(image: unknown): string | undefined {
  if (typeof image === "string" && image.trim()) return image.trim();
  if (Array.isArray(image)) {
    for (const entry of image) {
      const found = imageFromJsonLd(entry);
      if (found) return found;
    }
    return undefined;
  }
  const record = asRecord(image);
  if (!record) return undefined;
  const url = record.url ?? record.contentUrl ?? record["@id"];
  return typeof url === "string" && url.trim() ? url.trim() : undefined;
}

function priceFromOffers(offers: unknown): number | undefined {
  if (Array.isArray(offers)) {
    for (const offer of offers) {
      const price = priceFromOffers(offer);
      if (price != null) return price;
    }
    return undefined;
  }
  const record = asRecord(offers);
  if (!record) return undefined;
  return (
    parsePrice(record.price) ??
    parsePrice(record.lowPrice) ??
    parsePrice(asRecord(record.priceSpecification)?.price)
  );
}

function previewFromProductNode(
  node: Record<string, unknown>,
): RegistryItemPreview {
  const name =
    typeof node.name === "string" && node.name.trim()
      ? decodeEntities(node.name)
      : undefined;
  const imageUrl = imageFromJsonLd(node.image);
  const price = priceFromOffers(node.offers) ?? parsePrice(node.price);
  return { name, imageUrl, price };
}

function collectJsonLdNodes(html: string): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  const scriptRe =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed: unknown = JSON.parse(raw);
      const queue: unknown[] = [parsed];
      while (queue.length > 0) {
        const current = queue.shift();
        if (Array.isArray(current)) {
          queue.push(...current);
          continue;
        }
        const record = asRecord(current);
        if (!record) continue;
        nodes.push(record);
        const graph = record["@graph"];
        if (Array.isArray(graph)) queue.push(...graph);
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  return nodes;
}

export function parseRegistryItemPreview(html: string): RegistryItemPreview {
  const fromLd: RegistryItemPreview = {};
  for (const node of collectJsonLdNodes(html)) {
    if (!typeIncludesProduct(node["@type"])) continue;
    const preview = previewFromProductNode(node);
    if (!fromLd.name && preview.name) fromLd.name = preview.name;
    if (!fromLd.imageUrl && preview.imageUrl) fromLd.imageUrl = preview.imageUrl;
    if (fromLd.price == null && preview.price != null) {
      fromLd.price = preview.price;
    }
  }

  const ogTitle = metaContent(html, "og:title");
  const ogImage = metaContent(html, "og:image");
  const ogPrice =
    metaContent(html, "og:price:amount") ??
    metaContent(html, "product:price:amount");

  return {
    name: fromLd.name ?? ogTitle ?? undefined,
    imageUrl: fromLd.imageUrl ?? ogImage ?? undefined,
    price: fromLd.price ?? parsePrice(ogPrice),
  };
}
