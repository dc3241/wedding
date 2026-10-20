import { LandingPage } from "@/components/marketing/landing-page";
import { getPostLoginPath } from "@/lib/post-login-path";
import { pageMetadata } from "@/lib/seo";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Planning CRM",
  description:
    "First Look is a wedding planning CRM for planners and venues: lead, payment, and the wedding workbook in one platform. Couples can plan here too.",
  path: "/",
  absoluteTitle: "Wedding Planning CRM — First Look",
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

  return <LandingPage />;
}
