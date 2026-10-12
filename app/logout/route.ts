import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  DEMO_BOOT_COOKIE,
  demoBootCookieOptions,
} from "@/lib/demo/bootstrap-cookie";
import { createClient } from "@/utils/supabase/server";

/**
 * Sign-out must not post to the current URL. On a demo the address bar is
 * /demo, and that route only accepts GET, so a server action there returns 405.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
      303,
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(DEMO_BOOT_COOKIE, "", demoBootCookieOptions(0));

  return NextResponse.redirect(`${origin}/`, 303);
}
