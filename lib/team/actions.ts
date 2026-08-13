"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { resolveBusinessAccountId } from "@/lib/billing/resolve-account";
import type {
  AcceptAccountInvitationResult,
  CreateAccountInvitationResult,
  RemoveAccountMemberResult,
  RevokeAccountInvitationResult,
} from "@/lib/team/types";
import { TEAM_BUSINESS_ONLY_MESSAGE } from "@/lib/team/types";
import { createClient } from "@/utils/supabase/server";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const TEAM_PATH = "/account/team";

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function mapAcceptError(message: string): AcceptAccountInvitationResult {
  if (message.includes("invitation_not_business")) {
    return { ok: false, error: "not_business" };
  }
  if (message.includes("invitation_expired")) {
    return { ok: false, error: "expired" };
  }
  if (message.includes("invitation_revoked")) {
    return { ok: false, error: "revoked" };
  }
  if (message.includes("invitation_email_mismatch")) {
    return { ok: false, error: "email_mismatch" };
  }
  if (message.includes("invitation_already_accepted")) {
    return { ok: false, error: "already" };
  }
  if (
    message.includes("invalid_invitation") ||
    message.includes("not_authenticated")
  ) {
    return { ok: false, error: "invalid" };
  }
  return { ok: false, error: "invalid" };
}

function mapRemoveError(message: string): string {
  if (message.includes("cannot_remove_last_member")) {
    return "You can't remove the last member of this account.";
  }
  if (message.includes("member_not_found")) {
    return "Member not found or already removed.";
  }
  if (message.includes("not_account_member")) {
    return "You don't have access to this account.";
  }
  if (message.includes("not_authenticated")) {
    return "You must be logged in.";
  }
  return "Couldn't remove that member. Try again.";
}

/** Issue an account-seat invitation. Returns the raw token once — never persisted. */
export async function createAccountInvitation(
  accountId: string,
  email: string,
): Promise<CreateAccountInvitationResult> {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, error: "Email is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }

  // Explicit kind check on the target — do not rely on resolve mismatch
  // copy (that describes caller/account mismatch, not a kind violation).
  const { data: targetAccount, error: kindError } = await supabase
    .from("accounts")
    .select("kind")
    .eq("id", accountId)
    .maybeSingle();

  if (kindError) {
    return { ok: false, error: TEAM_BUSINESS_ONLY_MESSAGE };
  }

  if (!targetAccount || targetAccount.kind !== "business") {
    return { ok: false, error: TEAM_BUSINESS_ONLY_MESSAGE };
  }

  let businessAccountId: string;
  try {
    businessAccountId = await resolveBusinessAccountId(supabase);
  } catch {
    return { ok: false, error: "No business account found." };
  }

  if (accountId !== businessAccountId) {
    return { ok: false, error: "Account mismatch." };
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from("account_invitations")
    .insert({
      account_id: accountId,
      email: trimmed,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) {
    const message = error.message ?? "";
    if (
      message.includes("row-level security") ||
      message.includes("invitation_not_business")
    ) {
      return { ok: false, error: TEAM_BUSINESS_ONLY_MESSAGE };
    }
    return { ok: false, error: message };
  }

  revalidatePath(TEAM_PATH);
  return { ok: true, token: rawToken, invitationId: data.id };
}

/** Soft-revoke a pending account invitation. */
export async function revokeAccountInvitation(
  invitationId: string,
): Promise<RevokeAccountInvitationResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("account_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Invitation not found." };
  }

  revalidatePath(TEAM_PATH);
  return { ok: true };
}

/**
 * Accept an account invitation by raw token.
 * Maps P0001 raise messages to a discriminated result — never throws to the UI.
 */
export async function acceptAccountInvitation(
  token: string,
): Promise<AcceptAccountInvitationResult> {
  if (!token) {
    return { ok: false, error: "invalid" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("accept_account_invitation", {
    p_token: token,
  });

  if (error) {
    return mapAcceptError(error.message);
  }

  if (typeof data !== "string") {
    return { ok: false, error: "invalid" };
  }

  revalidatePath(TEAM_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { ok: true, accountId: data };
}

/**
 * Remove an account member (or leave). Surfaces the last-member guard as a
 * real message — never a raw Postgres error.
 */
export async function removeAccountMember(
  accountId: string,
  userId: string,
): Promise<RemoveAccountMemberResult> {
  const supabase = await createClient();

  let businessAccountId: string;
  try {
    businessAccountId = await resolveBusinessAccountId(supabase);
  } catch {
    return { ok: false, error: "No business account found." };
  }

  if (accountId !== businessAccountId) {
    return { ok: false, error: "Account mismatch." };
  }

  const { error } = await supabase.rpc("remove_account_member", {
    p_account_id: accountId,
    p_user_id: userId,
  });

  if (error) {
    return { ok: false, error: mapRemoveError(error.message ?? "") };
  }

  revalidatePath(TEAM_PATH);
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  return { ok: true };
}
