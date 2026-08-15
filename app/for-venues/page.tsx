import { ForVenuesPage } from "@/components/marketing/for-venues-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For venues — First Look",
  description:
    "CRM, team seats, and a fully white-labeled workspace — automated, so your team spends less time on admin and more time walking couples through your space.",
};

export default function ForVenuesRoute() {
  return <ForVenuesPage />;
}
