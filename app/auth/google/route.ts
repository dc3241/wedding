import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { buildGmailAuthUrl } from "@/lib/gmail-oauth";

const OAUTH_COOKIE = "gmail_oauth_state";
const COOKIE_MAX_AGE = 600;

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/projects";
  }
  return value;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const returnTo = safeReturnPath(searchParams.get("returnTo"));

  const state = crypto.randomUUID();
  const url = buildGmailAuthUrl(state);
  if (!url) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?gmail_error=${encodeURIComponent("Gmail OAuth is not configured.")}`,
        request.url
      )
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(OAUTH_COOKIE, JSON.stringify({ state, returnTo }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return NextResponse.redirect(url);
}
