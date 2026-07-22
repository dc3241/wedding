"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type CreateInvitationResult =
  | { ok: true; token: string; invitationId: string }
  | { ok: false; error: string };

export type RevokeInvitationResult =
  | { ok: true }
  | { ok: false; error: string };

export type AcceptInvitationResult =
  | { ok: true; projectId: string }
  | {
      ok: false;
      error:
        | "expired"
        | "revoked"
        | "email_mismatch"
        | "invalid"
        | "already"
        | string;
    };

export type RemoveProjectMemberResult =
  | { ok: true }
  | { ok: false; error: string };

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function accessPath(projectId: string) {
  return `/projects/${projectId}/access`;
}

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function mapAcceptError(message: string): AcceptInvitationResult {
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

/** Issue a project invitation. Returns the raw token once — never persisted. */
export async function createProjectInvitation(
  projectId: string,
  email: string,
): Promise<CreateInvitationResult> {
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

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from("project_invitations")
    .insert({
      project_id: projectId,
      email: trimmed,
      role: "couple",
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(accessPath(projectId));
  return { ok: true, token: rawToken, invitationId: data.id };
}

/** Soft-revoke a pending invitation. */
export async function revokeProjectInvitation(
  invitationId: string,
): Promise<RevokeInvitationResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId)
    .select("project_id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Invitation not found." };
  }

  revalidatePath(accessPath(data.project_id));
  return { ok: true };
}

/**
 * Accept a project invitation by raw token.
 * Maps P0001 raise messages to a discriminated result — never throws to the UI.
 */
export async function acceptProjectInvitation(
  token: string,
): Promise<AcceptInvitationResult> {
  if (!token) {
    return { ok: false, error: "invalid" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("accept_project_invitation", {
    p_token: token,
  });

  if (error) {
    return mapAcceptError(error.message);
  }

  if (typeof data !== "string") {
    return { ok: false, error: "invalid" };
  }

  revalidatePath(accessPath(data));
  revalidatePath(`/projects/${data}`, "layout");
  return { ok: true, projectId: data };
}

/**
 * Remove a project member. Targets (project_id, user_id) — project_members
 * has no id column. RLS: can_manage_project_access.
 */
export async function removeProjectMember(
  projectId: string,
  userId: string,
): Promise<RemoveProjectMemberResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .select("user_id");

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { ok: false, error: "Member not found or not removable." };
  }

  revalidatePath(accessPath(projectId));
  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: true };
}
