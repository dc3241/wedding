import "server-only";

import { createServiceRoleClient } from "@/utils/supabase/service-role";
import {
  extractSitePrice,
  type VendorSitePrice,
} from "@/lib/vendors/site-price-extract";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_PLACES = 20;
const FETCH_CONCURRENCY = 4;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_CHARS = 400_000;

const BLOCKED_HOST_SUFFIXES = [
  "theknot.com",
  "weddingwire.com",
  "theknotww.com",
];

export type { VendorSitePrice };

type CacheRow = {
  place_id: string;
  starting_amount: number | string | null;
  per_person: boolean;
  packages: unknown;
};

function isAllowedVendorUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return null;
  }
  if (host.includes(":") || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  if (
    BLOCKED_HOST_SUFFIXES.some(
      (blocked) => host === blocked || host.endsWith(`.${blocked}`),
    )
  ) {
    return null;
  }
  return url;
}

function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");

  return withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#36;/g, "$")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPublicHtml(start: URL): Promise<string | null> {
  let current = start;

  for (let hop = 0; hop < 3; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(current, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "User-Agent": "WeddingAppVendorPrice/1.0",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        const next = isAllowedVendorUrl(new URL(location, current).toString());
        if (!next) return null;
        current = next;
        continue;
      }

      if (!response.ok) return null;

      const contentLength = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(contentLength) && contentLength > 1_500_000) return null;

      const contentType = response.headers.get("content-type") ?? "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml")
      ) {
        return null;
      }

      const html = await response.text();
      return html.slice(0, MAX_HTML_CHARS);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

async function lookupVendorSite(
  websiteUri: string,
  categoryId: string,
): Promise<VendorSitePrice | null> {
  const url = isAllowedVendorUrl(websiteUri.trim());
  if (!url) return null;
  const html = await fetchPublicHtml(url);
  if (!html) return null;
  return extractSitePrice(htmlToText(html), categoryId);
}

function parsePackages(value: unknown): VendorSitePrice["packages"] {
  if (!Array.isArray(value)) return [];
  const packages: VendorSitePrice["packages"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const name = "name" in item && typeof item.name === "string" ? item.name.trim() : "";
    const amountRaw = "amount" in item ? item.amount : null;
    const amount = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);
    if (!name || !Number.isFinite(amount)) continue;
    packages.push({ name, amount: Math.round(amount) });
    if (packages.length >= 3) break;
  }
  return packages;
}

function rowToPrice(row: CacheRow): VendorSitePrice | null {
  const packages = parsePackages(row.packages);
  const starting =
    row.starting_amount == null ? null : Number(row.starting_amount);
  const startingAmount =
    starting != null && Number.isFinite(starting) ? Math.round(starting) : null;
  if (startingAmount == null && packages.length === 0) return null;
  return {
    startingAmount,
    perPerson: row.per_person === true,
    packages,
  };
}

async function readCache(
  placeIds: string[],
): Promise<Map<string, VendorSitePrice | null>> {
  const found = new Map<string, VendorSitePrice | null>();
  if (placeIds.length === 0) return found;

  try {
    const admin = createServiceRoleClient();
    const since = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const { data, error } = await admin
      .from("vendor_site_price_cache")
      .select("place_id, starting_amount, per_person, packages, fetched_at")
      .in("place_id", placeIds)
      .gte("fetched_at", since);

    if (error || !data) return found;

    for (const row of data as CacheRow[]) {
      found.set(row.place_id, rowToPrice(row));
    }
  } catch {
    return found;
  }

  return found;
}

async function writeCache(
  rows: {
    place_id: string;
    website_url: string;
    price: VendorSitePrice | null;
  }[],
): Promise<void> {
  if (rows.length === 0) return;
  try {
    const admin = createServiceRoleClient();
    const payload = rows.map((row) => ({
      place_id: row.place_id,
      website_url: row.website_url,
      starting_amount: row.price?.startingAmount ?? null,
      per_person: row.price?.perPerson ?? false,
      packages: row.price?.packages ?? [],
      fetched_at: new Date().toISOString(),
    }));
    await admin.from("vendor_site_price_cache").upsert(payload, {
      onConflict: "place_id",
    });
  } catch {
    // Cache is optional. A missing table or key still returns this search's prices.
  }
}

async function mapPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) return;
        await fn(item);
      }
    },
  );
  await Promise.all(workers);
}

export async function resolveVendorSitePrices(
  categoryId: string,
  places: { id: string; websiteUri?: string }[],
): Promise<Record<string, VendorSitePrice | null>> {
  const limited = places.slice(0, MAX_PLACES).filter((place) => place.id);
  const prices: Record<string, VendorSitePrice | null> = {};
  const cached = await readCache(limited.map((place) => place.id));

  const pending: { id: string; websiteUri: string }[] = [];
  for (const place of limited) {
    if (cached.has(place.id)) {
      prices[place.id] = cached.get(place.id) ?? null;
      continue;
    }
    const websiteUri = place.websiteUri?.trim();
    if (!websiteUri || !isAllowedVendorUrl(websiteUri)) {
      prices[place.id] = null;
      continue;
    }
    pending.push({ id: place.id, websiteUri });
  }

  await mapPool(pending, FETCH_CONCURRENCY, async (place) => {
    const price = await lookupVendorSite(place.websiteUri, categoryId);
    prices[place.id] = price;
    await writeCache([
      {
        place_id: place.id,
        website_url: place.websiteUri,
        price,
      },
    ]);
  });

  return prices;
}
