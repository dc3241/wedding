import "server-only";

import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/utils/supabase/service-role";

/** One write call, then dead. Long enough for a single PostgREST round trip. */
export const UNATTENDED_WRITE_TTL_SECONDS = 30;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signHs256Jwt(
  payload: Record<string, unknown>,
  secret: string,
): string {
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const body = base64UrlJson(payload);
  const sig = createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

/**
 * Earliest-created account_members row. Authorization is the same for every
 * current member (`is_account_member`); earliest is for reproducibility only.
 */
export async function resolveUnattendedActorUserId(
  accountId: string,
  serviceRole: ReturnType<typeof createServiceRoleClient> = createServiceRoleClient(),
): Promise<string> {
  const { data, error } = await serviceRole
    .from("account_members")
    .select("user_id")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.user_id) {
    throw new Error("No account member to impersonate.");
  }
  return data.user_id as string;
}

export type UnattendedWriteSession = {
  client: SupabaseClient;
  userId: string;
  expiresAt: Date;
};

/**
 * Short-lived authenticated client for one unattended write.
 * Not a general-purpose impersonation helper — agent writes only.
 *
 * Signs an HS256 user JWT with SUPABASE_JWT_SECRET (Project Settings → API).
 * Does not call generateLink / verifyOtp — no email, no auth.sessions row,
 * no last_sign_in_at bump. Never uses the service-role key as the request JWT.
 */
export async function mintUnattendedWriteSession(
  userId: string,
  ttlSeconds: number = UNATTENDED_WRITE_TTL_SECONDS,
): Promise<UnattendedWriteSession> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const jwtSecret = requireEnv("SUPABASE_JWT_SECRET");

  const serviceRole = createServiceRoleClient();
  const { data, error } = await serviceRole.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new Error(error?.message ?? "User not found for unattended write.");
  }

  if (ttlSeconds > UNATTENDED_WRITE_TTL_SECONDS) {
    throw new Error(
      `Unattended write TTL must be ${UNATTENDED_WRITE_TTL_SECONDS}s or less.`,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;
  const token = signHs256Jwt(
    {
      aud: "authenticated",
      role: "authenticated",
      sub: userId,
      email: data.user.email ?? "",
      iat: now,
      exp,
      iss: `${url}/auth/v1`,
    },
    jwtSecret,
  );

  // Installed supabase-js 2.108: `accessToken` is how fetchWithAuth gets the
  // user JWT. Without it, persistSession:false falls back to the anon key and
  // RLS sees `anon`, not the impersonated member.
  const client = createClient(url, anonKey, {
    accessToken: async () => token,
  });

  return { client, userId, expiresAt: new Date(exp * 1000) };
}
