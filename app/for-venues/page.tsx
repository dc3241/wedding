import { ForVenuesPage } from "@/components/marketing/for-venues-page";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Venue CRM",
  description:
    "A wedding venue CRM with white-label branding. Go from inquiry to payment to the couple's workbook — under your venue's name, not ours.",
  path: "/for-venues",
});

export default function ForVenuesRoute() {
  return <ForVenuesPage />;
}
