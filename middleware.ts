import { NextResponse, type NextRequest } from "next/server";
import { demoKindFromParam, demoWorkspacePath } from "@/lib/demo/entry-path";
import {
  ACCOUNT_INVITE_COOKIE,
  INVITE_COOKIE,
  pendingInviteCookieOptions,
} from "@/lib/invitations/pending-invite-config";
import { hasSupabaseAuthCookie } from "@/lib/supabase-auth-cookie";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * /demo stays in the address bar so the URL is safe to forward.
 * Once a session exists, render the workspace without a browser redirect
 * to /dashboard (that path sends cookieless visitors to /login).
 */
function rewriteDemoWorkspace(
  request: NextRequest,
  requestHeaders: Headers,
  sessionResponse: NextResponse,
) {
  const kind = demoKindFromParam(request.nextUrl.searchParams.get("kind"));
  const url = request.nextUrl.clone();
  url.pathname = demoWorkspacePath(kind);
  url.search = "";
  requestHeaders.set("x-pathname", url.pathname);

  const rewrite = NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
  for (const cookie of sessionResponse.headers.getSetCookie()) {
    rewrite.headers.append("set-cookie", cookie);
  }
  return rewrite;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Public /contact stays guest-cheap: skip getUser unless a session cookie exists.
  const isContact = pathname === "/contact" || pathname.startsWith("/contact/");
  if (isContact && !hasSupabaseAuthCookie(request.cookies.getAll())) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const { response, user } = await updateSession(request, requestHeaders);

  if (
    user &&
    pathname === "/demo" &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    return rewriteDemoWorkspace(request, requestHeaders, response);
  }

  if (!user) {
    // Account seats: /invite/account/[token] — separate cookie from project invites.
    if (pathname.startsWith("/invite/account/")) {
      const token = pathname.slice("/invite/account/".length).split("/")[0];
      if (token) {
        response.cookies.set(
          ACCOUNT_INVITE_COOKIE,
          token,
          pendingInviteCookieOptions(),
        );
      }
    } else if (pathname.startsWith("/invite/")) {
      const token = pathname.slice("/invite/".length).split("/")[0];
      if (token) {
        response.cookies.set(
          INVITE_COOKIE,
          token,
          pendingInviteCookieOptions(),
        );
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip static assets and fully-public surfaces
     * (/w/*, /vendor-confirm/*, /invoice/*, /inquire/*, /proposal/*)
     * so guest traffic never pays for getUser() session refresh.
     * /contact is in the matcher so signed-in app users keep a session;
     * guests still skip getUser() above.
     */
    "/((?!_next/static|_next/image|favicon.ico|w/|vendor-confirm/|invoice/|inquire/|proposal/).*)",
  ],
};
