import type { OutreachVendor } from "@/components/vendors/outreach-vendor";

export type VendorComparisonColumn = {
  projectVendorId: string;
  vendorId: string;
  name: string;
  status: OutreachVendor["status"];
  quotedPrice: number | null;
  sitePrice: {
    startingAmount: number;
    perPerson: boolean;
  } | null;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
  website: string | null;
  area: string | null;
  notes: string | null;
  overview: string | null;
};

export type VendorComparison = {
  categoryLabel: string;
  columns: VendorComparisonColumn[];
  showGoogleAttribution: boolean;
};
