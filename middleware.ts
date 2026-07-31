import { type NextRequest } from "next/server";
import {
  INVITE_COOKIE,
  pendingInviteCookieOptions,
} from "@/lib/invitations/pending-invite-config";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/invite/") && !user) {
    const token = pathname.slice("/invite/".length).split("/")[0];
    if (token) {
      response.cookies.set(
        INVITE_COOKIE,
        token,
        pendingInviteCookieOptions(),
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
