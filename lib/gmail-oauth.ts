const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export const GMAIL_OAUTH_SCOPES = ["openid", "email", GMAIL_SEND_SCOPE].join(
  " "
);

export function getGmailOAuthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildGmailAuthUrl(state: string): string | null {
  const config = getGmailOAuthConfig();
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GMAIL_OAUTH_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
};

export type GmailTokenExchangeResult =
  | {
      ok: true;
      accessToken: string;
      refreshToken: string | null;
      tokenExpiry: string | null;
      email: string;
    }
  | { ok: false; error: string };

export async function exchangeGmailCode(
  code: string
): Promise<GmailTokenExchangeResult> {
  const config = getGmailOAuthConfig();
  if (!config) {
    return { ok: false, error: "Gmail OAuth is not configured." };
  }

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
  } catch {
    return { ok: false, error: "Could not reach Google to exchange the code." };
  }

  let tokens: TokenResponse;
  try {
    tokens = (await tokenResponse.json()) as TokenResponse;
  } catch {
    return { ok: false, error: "Invalid token response from Google." };
  }

  if (!tokenResponse.ok || !tokens.access_token) {
    return {
      ok: false,
      error: tokens.error_description ?? tokens.error ?? "Token exchange failed.",
    };
  }

  const email = await resolveGoogleEmail(tokens.access_token, tokens.id_token);
  if (!email) {
    return { ok: false, error: "Could not determine your Google account email." };
  }

  const tokenExpiry =
    typeof tokens.expires_in === "number"
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

  return {
    ok: true,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    tokenExpiry,
    email,
  };
}

async function resolveGoogleEmail(
  accessToken: string,
  idToken?: string
): Promise<string | null> {
  const fromIdToken = emailFromIdToken(idToken);
  if (fromIdToken) return fromIdToken;

  try {
    const response = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as { email?: string };
    return data.email?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;

  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { email?: string };

    return decoded.email?.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}
