import { LandingPage } from "@/components/marketing/landing-page";
import { getPostLoginPath } from "@/lib/post-login-path";
import { createClient } from "@/utils/supabase/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "First Look — Wedding planning for couples, planners, and venues",
  description:
    "Couples plan the day in one workspace. Planners and venues capture inquiries, run a pipeline, and turn proposals into signed contracts — then invite the couple into the same wedding.",
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
