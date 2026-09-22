import { NextResponse, type NextRequest } from "next/server";
import {
  ACCOUNT_INVITE_COOKIE,
  INVITE_COOKIE,
  pendingInviteCookieOptions,
} from "@/lib/invitations/pending-invite-config";
import { hasSupabaseAuthCookie } from "@/lib/supabase-auth-cookie";
import { updateSession } from "@/utils/supabase/middleware";

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
