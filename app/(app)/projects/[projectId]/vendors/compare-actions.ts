"use server";

import { IN_FLIGHT_STATUSES } from "@/components/vendors/outreach-vendor";
import type { OutreachVendor } from "@/components/vendors/outreach-vendor";
import { fetchLivePlaceDetails } from "@/lib/places-live-details";
import {
  compareSelection,
  vendorCategoryKey,
} from "@/lib/vendors/compare-selection";
import { resolveVendorSitePrices } from "@/lib/vendors/site-price";
import type { VendorComparison } from "@/lib/vendors/vendor-comparison";
import { createClient } from "@/utils/supabase/server";

type VendorEmbed = {
  id: string;
  name: string;
  category: string | null;
  website: string | null;
  address: string | null;
  service_area: string | null;
  ai_overview: string | null;
  external_place_id: string | null;
};

type ProjectVendorRow = {
  id: string;
  status: string;
  quoted_price: number | string | null;
  notes: string | null;
  vendors: VendorEmbed | VendorEmbed[] | null;
};

function oneVendor(value: ProjectVendorRow["vendors"]): VendorEmbed | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function asMoney(value: number | string | null): number | null {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function httpUrl(value: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isInFlight(status: string): status is OutreachVendor["status"] {
  return (IN_FLIGHT_STATUSES as readonly string[]).includes(status);
}

export async function loadVendorComparison(
  projectId: string,
  projectVendorIds: string[],
): Promise<{ ok: true; comparison: VendorComparison } | { ok: false; error: string }> {
  const ids = [...new Set(projectVendorIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length < 2) {
    return { ok: false, error: "Select at least two vendors." };
  }
  if (ids.length > 4) {
    return { ok: false, error: "Compare up to 4 vendors." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_vendors")
    .select(
      "id, status, quoted_price, notes, vendors(id, name, category, website, address, service_area, ai_overview, external_place_id)",
    )
    .eq("project_id", projectId)
    .in("id", ids);

  if (error) {
    return { ok: false, error: "Could not load those vendors." };
  }

  const byId = new Map(
    ((data ?? []) as ProjectVendorRow[]).map((row) => [row.id, row]),
  );
  const ordered = ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });

  if (ordered.length !== ids.length) {
    return { ok: false, error: "Those vendors are no longer on this shortlist." };
  }

  if (ordered.some((row) => !isInFlight(row.status))) {
    return { ok: false, error: "Those vendors are no longer on this shortlist." };
  }

  const selection = compareSelection(
    ordered.map((row) => ({
      id: row.id,
      category: oneVendor(row.vendors)?.category ?? null,
    })),
  );
  if (!selection.ok) {
    if (selection.reason === "too_many") {
      return { ok: false, error: "Compare up to 4 vendors." };
    }
    return { ok: false, error: "Pick vendors in one category." };
  }

  const vendors = ordered.map((row) => ({
    row,
    vendor: oneVendor(row.vendors),
  }));
  if (vendors.some((item) => !item.vendor)) {
    return { ok: false, error: "Could not load those vendors." };
  }

  const places = vendors.flatMap((item) => {
    const placeId = item.vendor?.external_place_id?.trim();
    if (!placeId) return [];
    return [
      {
        id: placeId,
        websiteUri: item.vendor?.website ?? undefined,
      },
    ];
  });
  const uniquePlaces = [...new Map(places.map((place) => [place.id, place])).values()];

  const [liveList, sitePrices] = await Promise.all([
    Promise.all(
      uniquePlaces.map(async (place) => {
        const details = await fetchLivePlaceDetails(place.id);
        return [place.id, details] as const;
      }),
    ),
    resolveVendorSitePrices(selection.categoryKey, uniquePlaces),
  ]);
  const liveByPlace = new Map(liveList);

  const columns = vendors.map((item) => {
    const vendor = item.vendor!;
    const placeId = vendor.external_place_id?.trim() || null;
    const live = placeId ? liveByPlace.get(placeId) : null;
    const site = placeId ? sitePrices[placeId] : null;
    const area = vendor.address?.trim() || vendor.service_area?.trim() || null;
    const categoryMatches =
      vendorCategoryKey(vendor.category) === selection.categoryKey;

    return {
      projectVendorId: item.row.id,
      vendorId: vendor.id,
      name: vendor.name,
      status: item.row.status as OutreachVendor["status"],
      quotedPrice: asMoney(item.row.quoted_price),
      sitePrice:
        categoryMatches && site?.startingAmount != null
          ? {
              startingAmount: site.startingAmount,
              perPerson: site.perPerson,
            }
          : null,
      rating: live?.rating ?? null,
      userRatingCount: live?.userRatingCount ?? null,
      googleMapsUri: live?.googleMapsUri ?? null,
      website: httpUrl(vendor.website),
      area,
      notes: item.row.notes?.trim() || null,
      overview: vendor.ai_overview?.trim() || null,
    };
  });

  return {
    ok: true,
    comparison: {
      categoryLabel: selection.categoryLabel,
      columns,
      showGoogleAttribution: columns.some((column) => column.rating != null),
    },
  };
}
