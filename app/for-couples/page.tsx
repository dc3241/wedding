import { ForCouplesPage } from "@/components/marketing/for-couples-page";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Planning App for Couples",
  description:
    "Plan your wedding in one workspace: checklist, budget, guests, seating, and a wedding website. Free to start. If you have a planner, they can invite you in.",
  path: "/for-couples",
});

export default function ForCouplesRoute() {
  return <ForCouplesPage />;
}
