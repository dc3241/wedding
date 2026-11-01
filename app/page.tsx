import {
  COUPLE_LANDING_DESCRIPTION,
  CoupleLandingPage,
} from "@/components/marketing/couple-landing-page";
import { LandingPage } from "@/components/marketing/landing-page";
import { B2B_MARKETING_ENABLED } from "@/lib/marketing-flags";
import { getPostLoginPath } from "@/lib/post-login-path";
import { pageMetadata } from "@/lib/seo";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = B2B_MARKETING_ENABLED
  ? pageMetadata({
      title: "Wedding Planning CRM",
      description:
        "First Look is a wedding planning CRM for planners and venues: lead, payment, and the wedding workbook in one platform. Couples can plan here too.",
      path: "/",
      absoluteTitle: "Wedding Planning CRM — First Look",
    })
  : pageMetadata({
      title: "Free Wedding Planning App",
      description: COUPLE_LANDING_DESCRIPTION,
      path: "/",
      absoluteTitle: "Free Wedding Planning App & Wedding Website | First Look",
    });

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Anonymous demo sessions stay on the marketing site so Back and the
  // wordmark can leave the workspace. Real accounts still go to the app.
  if (user && user.is_anonymous !== true) {
    redirect(await getPostLoginPath(supabase));
  }

  return B2B_MARKETING_ENABLED ? <LandingPage /> : <CoupleLandingPage />;
}
