import { ForPlannersPage } from "@/components/marketing/for-planners-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For wedding planners — First Look",
  description:
    "Leads, contracts, seating, billing, and a branded client experience. First Look replaces the spreadsheet-and-five-tools stack most planning businesses run on today.",
};

export default function ForPlannersRoute() {
  return <ForPlannersPage />;
}
