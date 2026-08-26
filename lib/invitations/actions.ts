"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { appOrigin } from "@/lib/url";
import { sendEmailBestEffort } from "@/lib/email/send-best-effort";
import { PROJECT_INVITE_ROLES } from "@/lib/invitations/constants";
import type {
  AcceptInvitationResult,
  CreateInvitationResult,
  ProjectInviteRole,
  RemoveProjectMemberResult,
  RevokeInvitationResult,
} from "@/lib/invitations/types";
import { tabsForAccountKind } from "@/lib/project-tabs";
import { createClient } from "@/utils/supabase/server";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const INVITE_TTL_DAYS = 14;

function isProjectInviteRole(role: string): role is ProjectInviteRole {
  return (PROJECT_INVITE_ROLES as readonly string[]).includes(role);
}

function accessPath(projectId: string) {
  return `/projects/${projectId}/access`;
}

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

function projectInviteUrl(token: string): string {
  return `${appOrigin()}/invite/${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTabList(labels: string[]): string {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function workspaceTabLabels(role: ProjectInviteRole): string[] {
  // Invited members have no account — same filter as CoupleShell (§6 / CAL-04).
  return tabsForAccountKind(null, role).map((tab) => tab.label);
}

function buildProjectInviteEmail(args: {
  inviteUrl: string;
  role: ProjectInviteRole;
  projectName: string;
}): { subject: string; text: string; html: string } {
  const tabList = formatTabList(workspaceTabLabels(args.role));
  const roleNoun = args.role === "collaborator" ? "a collaborator" : "the couple";
  const subject = `You're invited to ${args.projectName} on First Look`;
  const text = [
    `You've been invited as ${roleNoun} on ${args.projectName}.`,
    "",
    `You'll see the wedding workspace: ${tabList}.`,
    "",
    `Accept the invitation: ${args.inviteUrl}`,
    "",
    `This link expires in ${INVITE_TTL_DAYS} days.`,
    "",
  ].join("\n");
  const html = [
    `<p>You've been invited as ${escapeHtml(roleNoun)} on ${escapeHtml(args.projectName)}.</p>`,
    `<p>You'll see the wedding workspace: ${escapeHtml(tabList)}.</p>`,
    `<p><a href="${escapeHtml(args.inviteUrl)}">Accept the invitation</a></p>`,
    `<p>This link expires in ${INVITE_TTL_DAYS} days.</p>`,
  ].join("");
  return { subject, text, html };
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
  role: string = "couple",
): Promise<CreateInvitationResult> {
  const trimmed = email.trim();
  if (!trimmed) {
    return { ok: false, error: "Email is required." };
  }

  if (!isProjectInviteRole(role)) {
    return { ok: false, error: "Invalid invitation role." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", projectId)
    .maybeSingle();
  const projectName = project?.name?.trim() || "a wedding";

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from("project_invitations")
    .insert({
      project_id: projectId,
      email: trimmed,
      role,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  // Best-effort delivery — the row is committed; never fail the invite on send.
  const inviteUrl = projectInviteUrl(rawToken);
  const body = buildProjectInviteEmail({
    inviteUrl,
    role,
    projectName,
  });
  const emailSent = await sendEmailBestEffort(
    {
      to: trimmed,
      subject: body.subject,
      text: body.text,
      html: body.html,
    },
    "createProjectInvitation",
  );

  revalidatePath(accessPath(projectId));
  return {
    ok: true,
    token: rawToken,
    invitationId: data.id,
    emailSent,
  };
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
 * Also soft-revokes any accepted invitation for that user so invite history
 * matches live membership (Has access reads project_members).
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

  // Best-effort: membership delete is what revokes access. Invite soft-revoke
  // keeps invitation history aligned; failure must not undo the remove.
  await supabase
    .from("project_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("project_id", projectId)
    .eq("accepted_by", userId)
    .is("revoked_at", null);

  revalidatePath(accessPath(projectId));
  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: true };
}
