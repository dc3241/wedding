import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";
import { createClient } from "@/utils/supabase/server";

export type EnrichmentResult =
  | { ok: true }
  | { ok: false; error: string };

type VendorRow = {
  id: string;
  name: string;
  category: string | null;
  website: string | null;
  external_place_id: string | null;
  contact_email: string | null;
};

type ModelExtraction = {
  overview: string;
  contact_email: string | null;
  booking_link: string | null;
};

const MAX_WEBSITE_TEXT = 12_000;

export async function runVendorEnrichment(
  vendorId: string
): Promise<EnrichmentResult> {
  const supabase = await createClient();

  const { data: vendor, error: loadError } = await supabase
    .from("vendors")
    .select("id, name, category, website, external_place_id, contact_email")
    .eq("id", vendorId)
    .maybeSingle();

  if (loadError || !vendor) {
    return { ok: false, error: "Vendor not found." };
  }

  let website = vendor.website?.trim() || null;

  if (!website && vendor.external_place_id) {
    const fromPlaces = await fetchPlacesWebsite(vendor.external_place_id);
    if (fromPlaces) {
      website = fromPlaces;
      await supabase
        .from("vendors")
        .update({ website })
        .eq("id", vendorId);
    }
  }

  if (!website) {
    return { ok: false, error: "No website available for this vendor." };
  }

  const siteText = await fetchWebsiteText(website);
  if (!siteText || siteText.length < 50) {
    return { ok: false, error: "Could not read enough text from the website." };
  }

  const extraction = await extractWithModel(vendor, siteText);
  if (!extraction) {
    return { ok: false, error: "Could not generate an overview." };
  }

  let aiOverview = extraction.overview.trim();
  if (extraction.booking_link) {
    aiOverview += `\n\nContact / book: ${extraction.booking_link}`;
  }

  const updates: {
    ai_overview: string;
    last_enriched_at: string;
    contact_email?: string;
  } = {
    ai_overview: aiOverview,
    last_enriched_at: new Date().toISOString(),
  };

  if (extraction.contact_email) {
    updates.contact_email = extraction.contact_email;
  }

  const { error: updateError } = await supabase
    .from("vendors")
    .update(updates)
    .eq("id", vendorId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}

async function fetchPlacesWebsite(placeId: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "websiteUri",
        },
      }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as { websiteUri?: string };
    return data.websiteUri?.trim() || null;
  } catch {
    return null;
  }
}

async function fetchWebsiteText(url: string): Promise<string | null> {
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const response = await fetch(normalized, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; WeddingPlannerBot/1.0; +https://localhost)",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") ?? "";
    if (
      !contentType.includes("text/html") &&
      !contentType.includes("text/plain") &&
      !contentType.includes("application/xhtml")
    ) {
      return null;
    }

    const html = await response.text();
    return extractTextFromHtml(html);
  } catch {
    return null;
  }
}

function extractTextFromHtml(html: string): string {
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ");

  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, MAX_WEBSITE_TEXT);
}

async function extractWithModel(
  vendor: VendorRow,
  siteText: string
): Promise<ModelExtraction | null> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are helping a couple plan their wedding. Based ONLY on the following text scraped from the vendor's own website — never invent details and do not use or refer to Google reviews or third-party review sites.

Write a concise overview (2–4 sentences) of what this business offers, especially for weddings or events if mentioned.

Also extract:
- contact_email: a business contact email if clearly present on the site, otherwise null
- booking_link: a booking, inquiry, or contact page URL if clearly present (full https URL), otherwise null

Respond with JSON only, no markdown:
{"overview":"...","contact_email":null,"booking_link":null}

Vendor name: ${vendor.name}
Category: ${vendor.category ?? "unknown"}

Website text:
${siteText}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };

    const raw = data.content?.find((block) => block.type === "text")?.text;
    if (!raw) return null;

    const jsonText = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(jsonText) as ModelExtraction;
    if (!parsed.overview?.trim()) return null;

    return {
      overview: parsed.overview.trim(),
      contact_email: normalizeEmail(parsed.contact_email),
      booking_link: normalizeUrl(parsed.booking_link),
    };
  } catch {
    return null;
  }
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return email;
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return null;
  return `https://${url}`;
}
