import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AuthenticatedAppShell } from "@/components/authenticated-app-shell";
import { noIndexRobots } from "@/lib/seo";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  ...noIndexRobots,
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AuthenticatedAppShell>{children}</AuthenticatedAppShell>;
}
