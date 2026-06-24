import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeGmailCode } from "@/lib/gmail-oauth";
import { createClient } from "@/utils/supabase/server";

const OAUTH_COOKIE = "gmail_oauth_state";

type OAuthCookie = {
  state: string;
  returnTo: string;
};

function safeReturnPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/projects";
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(OAUTH_COOKIE)?.value;
  cookieStore.delete(OAUTH_COOKIE);

  let returnTo = "/projects";
  if (rawCookie) {
    try {
      const parsed = JSON.parse(rawCookie) as OAuthCookie;
      returnTo = safeReturnPath(parsed.returnTo);
      if (!state || state !== parsed.state) {
        return NextResponse.redirect(
          `${origin}${returnTo}?gmail_error=${encodeURIComponent("OAuth state mismatch. Try again.")}`
        );
      }
    } catch {
      return NextResponse.redirect(
        `${origin}${returnTo}?gmail_error=${encodeURIComponent("OAuth session expired. Try again.")}`
      );
    }
  } else if (!oauthError) {
    return NextResponse.redirect(
      `${origin}${returnTo}?gmail_error=${encodeURIComponent("OAuth session expired. Try again.")}`
    );
  }

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}${returnTo}?gmail_error=${encodeURIComponent("Google sign-in was cancelled or denied.")}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}${returnTo}?gmail_error=${encodeURIComponent("Missing authorization code from Google.")}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const exchange = await exchangeGmailCode(code);
  if (!exchange.ok) {
    return NextResponse.redirect(
      `${origin}${returnTo}?gmail_error=${encodeURIComponent(exchange.error)}`
    );
  }

  const row: {
    user_id: string;
    provider: "gmail";
    email: string;
    access_token: string;
    refresh_token?: string;
    token_expiry: string | null;
    updated_at: string;
  } = {
    user_id: user.id,
    provider: "gmail",
    email: exchange.email,
    access_token: exchange.accessToken,
    token_expiry: exchange.tokenExpiry,
    updated_at: new Date().toISOString(),
  };

  if (exchange.refreshToken) {
    row.refresh_token = exchange.refreshToken;
  }

  const { data: existing } = await supabase
    .from("email_credentials")
    .select("id, refresh_token")
    .eq("user_id", user.id)
    .eq("provider", "gmail")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("email_credentials")
      .update({
        email: row.email,
        access_token: row.access_token,
        refresh_token: row.refresh_token ?? existing.refresh_token,
        token_expiry: row.token_expiry,
        updated_at: row.updated_at,
      })
      .eq("id", existing.id);

    if (error) {
      return NextResponse.redirect(
        `${origin}${returnTo}?gmail_error=${encodeURIComponent(error.message)}`
      );
    }
  } else {
    const { error } = await supabase.from("email_credentials").insert({
      ...row,
      refresh_token: row.refresh_token ?? null,
    });

    if (error) {
      return NextResponse.redirect(
        `${origin}${returnTo}?gmail_error=${encodeURIComponent(error.message)}`
      );
    }
  }

  return NextResponse.redirect(`${origin}${returnTo}?gmail_connected=1`);
}
