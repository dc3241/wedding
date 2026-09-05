import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { performStartDemo } from "@/lib/demo/perform-start-demo";

export const dynamic = "force-dynamic";

const FALLBACK_PATH = "/for-planners?demo_error=1";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function redirectWithCookies(url: string, cookiesToSet: CookieToSet[]) {
  const response = NextResponse.redirect(url);
  for (const { name, value, options } of cookiesToSet) {
    response.cookies.set(name, value, options);
  }
  return response;
}

/**
 * DEMO-LINK-01 — bare GET demo entry for cold outreach.
 * Sets the anonymous session cookie on the redirect (no JS required).
 */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const fallback = `${origin}${FALLBACK_PATH}`;
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

    const result = await performStartDemo(supabase, "business");

    if (result.status === "existing") {
      // Real session: never clone. /dashboard is planner home; the page
      // itself bounces personal accounts to their project.
      return redirectWithCookies(`${origin}/dashboard`, cookiesToSet);
    }

    if (result.status === "ok") {
      return redirectWithCookies(`${origin}/dashboard`, cookiesToSet);
    }

    return NextResponse.redirect(fallback);
  } catch {
    return NextResponse.redirect(fallback);
  }
}
