import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { createClient } from "@/utils/supabase/server";

/**
 * ADMIN-00 gate. Outside app/(app) on purpose — it must never inherit
 * PlannerShell/CoupleShell or the account-kind branching in
 * app/(app)/layout.tsx. This is its own root-ish layout segment
 * (route-group sibling, same pattern as app/(locked)).
 *
 * Hard requirement: a real, authenticated couple/planner account hitting
 * /admin gets notFound() — a genuine 404, not a redirect that would
 * confirm the route exists. Unauthenticated visitors get the same
 * redirect-to-/login every other protected route in the app already
 * gives, so that alone reveals nothing route-specific.
 */
export default async function AdminLayout({
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

  const isAdmin = await checkIsAdmin(supabase);
  if (!isAdmin) {
    notFound();
  }

  return <AdminShell>{children}</AdminShell>;
}
