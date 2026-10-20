import { WeddingBudgetTrackingPage } from "@/components/marketing/wedding-budget-tracking-page";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Budget Tracking",
  description:
    "Stop guessing at hidden wedding costs. See how First Look tracks real spending against every vendor quote, automatically.",
  path: "/wedding-budget-tracking",
  absoluteTitle: "Wedding Budget Tracking, Simplified | First Look",
});

export default function WeddingBudgetTrackingRoute() {
  return <WeddingBudgetTrackingPage />;
}
