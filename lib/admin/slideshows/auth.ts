import "server-only";
import { NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/admin/is-admin";
import { createClient } from "@/utils/supabase/server";

/** For API routes: returns the admin's supabase client, or a 404 response. */
export async function adminOr404() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await checkIsAdmin(supabase))) {
    return { ok: false as const, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { ok: true as const, supabase };
}
