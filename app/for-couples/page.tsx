import { ForCouplesPage } from "@/components/marketing/for-couples-page";
import { B2B_MARKETING_ENABLED } from "@/lib/marketing-flags";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Planning App for Couples",
  description:
    "Plan your wedding in one workspace: checklist, budget, guests, seating, and a wedding website. Free to start. If you have a planner, they can invite you in.",
  path: "/for-couples",
});

export default function ForCouplesRoute() {
  // COUPLES-PIVOT: "/" is the couple landing. One URL keeps ranking signals
  // on the homepage instead of splitting them across duplicate pages.
  if (!B2B_MARKETING_ENABLED) permanentRedirect("/");
  return <ForCouplesPage />;
}
