import { WeddingBudgetTrackingPage } from "@/components/marketing/wedding-budget-tracking-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    absolute: "Wedding Budget Tracking, Simplified | First Look",
  },
  description:
    "Stop guessing at hidden wedding costs. See how First Look tracks real spending against every vendor quote, automatically.",
};

export default function WeddingBudgetTrackingRoute() {
  return <WeddingBudgetTrackingPage />;
}
