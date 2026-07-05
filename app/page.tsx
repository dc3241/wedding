import { LandingPage } from "@/components/marketing/landing-page";
import { getPostLoginPath } from "@/lib/post-login-path";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "First Look — Wedding planning, modern romantic",
  description:
    "Checklist, budget, vendors, guests, and a shareable wedding website — calm planning for couples and professional planners.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getPostLoginPath(supabase));
  }

  return <LandingPage />;
}
