import { type NextRequest } from "next/server";
import {
  ACCOUNT_INVITE_COOKIE,
  INVITE_COOKIE,
  pendingInviteCookieOptions,
} from "@/lib/invitations/pending-invite-config";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const { response, user } = await updateSession(request, requestHeaders);

  const { pathname } = request.nextUrl;
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
     * Skip static assets and fully-public surfaces (/w/*, /vendor-confirm/*)
     * so guest traffic never pays for getUser() session refresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|w/|vendor-confirm/).*)",
  ],
};
