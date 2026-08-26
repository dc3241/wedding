import { PROJECT_INVITE_ROLES } from "./constants";

export type ProjectInviteRole = (typeof PROJECT_INVITE_ROLES)[number];

export type CreateInvitationResult =
  | { ok: true; token: string; invitationId: string; emailSent: boolean }
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
