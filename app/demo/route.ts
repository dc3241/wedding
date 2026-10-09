import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { demoEntryPath, demoKindFromParam } from "@/lib/demo/entry-path";
import { performStartDemo } from "@/lib/demo/perform-start-demo";
import type { StartDemoResult } from "@/lib/demo/types";

export const dynamic = "force-dynamic";

/** Set on the hop that mints a session. Stops a redirect loop if the auth cookie never sticks. */
const BOOT_COOKIE = "demo_bootstrap";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function fallbackPath(status: StartDemoResult["status"]): string {
  if (status === "throttled") return "/for-planners?demo_error=throttled";
  if (status === "unavailable") return "/for-planners?demo_error=unavailable";
  return "/for-planners?demo_error=1";
}

function redirectWithCookies(url: string, cookiesToSet: CookieToSet[]) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }
  return response;
}

/**
 * DEMO-LINK-01 — shareable demo entry.
 * Cold visitors get an anonymous session, then come back to this same URL.
 * Middleware renders the workspace while the address bar stays on /demo.
 * Sending /dashboard does not work: that path has no session and redirects to /login.
 */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const kind = demoKindFromParam(request.nextUrl.searchParams.get("kind"));
  const cookiesToSet: CookieToSet[] = [];

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(incoming) {
            incoming.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              cookiesToSet.push({ name, value, options });
            });
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && request.cookies.get(BOOT_COOKIE)?.value === "1") {
      const failed = NextResponse.redirect(`${origin}${fallbackPath("error")}`);
      failed.headers.set("Cache-Control", "private, no-store");
      failed.cookies.set(BOOT_COOKIE, "", { path: "/", maxAge: 0 });
      return failed;
    }

    const result = await performStartDemo(supabase, kind);

    if (result.status === "ok") {
      cookiesToSet.push({
        name: BOOT_COOKIE,
        value: "1",
        options: {
          path: "/",
          maxAge: 120,
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        },
      });
      return redirectWithCookies(
        `${origin}${demoEntryPath(kind)}`,
        cookiesToSet,
      );
    }

    // Logged-in account: don't replace their session with a demo.
    // Middleware usually renders their workspace at /demo before we get here.
    if (result.status === "existing") {
      const dest = kind === "personal" ? "/projects" : "/dashboard";
      return redirectWithCookies(`${origin}${dest}`, cookiesToSet);
    }

    return NextResponse.redirect(`${origin}${fallbackPath(result.status)}`);
  } catch {
    return NextResponse.redirect(`${origin}${fallbackPath("error")}`);
  }
}
