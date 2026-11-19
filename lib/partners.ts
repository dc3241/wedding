/**
 * MEDIA-07: where partner (affiliate / sponsor) cards may appear.
 * Stored as text[] on partner_links.placements; no DB CHECK, so add new
 * keys here and render a <PartnerSlot placement="…"> where they live.
 */
export const PARTNER_PLACEMENTS = [
  { id: "home", label: "Homepage" },
  { id: "plan-hub", label: "Planning tools hub" },
  { id: "tool:cost", label: "Cost calculator" },
  { id: "tool:alcohol", label: "Alcohol calculator" },
  { id: "tool:venue-quiz", label: "Venue quiz" },
  { id: "ideas", label: "Ideas index" },
  { id: "article", label: "Every article (bottom)" },
  { id: "directory", label: "Directory pages" },
] as const;

export type PartnerPlacement = (typeof PARTNER_PLACEMENTS)[number]["id"];

export function isPartnerPlacement(v: string): v is PartnerPlacement {
  return PARTNER_PLACEMENTS.some((p) => p.id === v);
}

export type PartnerCard = {
  slug: string;
  kind: "affiliate" | "sponsor";
  partner_name: string;
  title: string;
  body: string | null;
  cta_label: string;
  image_url: string | null;
};

export function partnerHref(slug: string): string {
  return `/go/${slug}`;
}
