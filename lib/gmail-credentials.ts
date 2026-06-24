import { getGmailOAuthConfig } from "@/lib/gmail-oauth";
import { createClient } from "@/utils/supabase/server";

type EmailCredentialRow = {
  id: string;
  email: string;
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
};

export type GmailSendAuth =
  | { ok: true; accessToken: string; fromEmail: string }
  | { ok: false; error: string; needsConnect: boolean };

const EXPIRY_BUFFER_MS = 60_000;

/** Loads Gmail tokens server-side only — never expose to the client. */
export async function getGmailAccessForSend(): Promise<GmailSendAuth> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be logged in.", needsConnect: false };
  }

  const { data: creds, error } = await supabase
    .from("email_credentials")
    .select("id, email, access_token, refresh_token, token_expiry")
    .eq("provider", "gmail")
    .maybeSingle();

  if (error || !creds) {
    return {
      ok: false,
      error: "Connect Gmail before sending outreach.",
      needsConnect: true,
    };
  }

  const row = creds as EmailCredentialRow;
  const expiresAt = row.token_expiry
    ? new Date(row.token_expiry).getTime()
    : 0;
  const isExpired = !expiresAt || Date.now() >= expiresAt - EXPIRY_BUFFER_MS;

  if (!isExpired) {
    return {
      ok: true,
      accessToken: row.access_token,
      fromEmail: row.email,
    };
  }

  if (!row.refresh_token) {
    return {
      ok: false,
      error: "Gmail session expired. Reconnect Gmail to send.",
      needsConnect: true,
    };
  }

  const refreshed = await refreshGmailAccessToken(row.refresh_token);
  if (!refreshed.ok) {
    return {
      ok: false,
      error: refreshed.error,
      needsConnect: refreshed.needsConnect,
    };
  }

  const { error: updateError } = await supabase
    .from("email_credentials")
    .update({
      access_token: refreshed.accessToken,
      token_expiry: refreshed.tokenExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (updateError) {
    return { ok: false, error: updateError.message, needsConnect: false };
  }

  return {
    ok: true,
    accessToken: refreshed.accessToken,
    fromEmail: row.email,
  };
}

type RefreshResult =
  | { ok: true; accessToken: string; tokenExpiry: string | null }
  | { ok: false; error: string; needsConnect: boolean };

async function refreshGmailAccessToken(
  refreshToken: string
): Promise<RefreshResult> {
  const config = getGmailOAuthConfig();
  if (!config) {
    return {
      ok: false,
      error: "Gmail OAuth is not configured.",
      needsConnect: false,
    };
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !data.access_token) {
      const invalidGrant = data.error === "invalid_grant";
      return {
        ok: false,
        error: invalidGrant
          ? "Gmail session expired. Reconnect Gmail to send."
          : (data.error_description ?? data.error ?? "Could not refresh Gmail token."),
        needsConnect: invalidGrant,
      };
    }

    const tokenExpiry =
      typeof data.expires_in === "number"
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null;

    return { ok: true, accessToken: data.access_token, tokenExpiry };
  } catch {
    return {
      ok: false,
      error: "Could not reach Google to refresh your Gmail token.",
      needsConnect: false,
    };
  }
}
