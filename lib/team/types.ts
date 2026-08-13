export const TEAM_BUSINESS_ONLY_MESSAGE =
  "Team invitations are only available for business accounts.";

export type CreateAccountInvitationResult =
  | { ok: true; token: string; invitationId: string }
  | { ok: false; error: string };

export type RevokeAccountInvitationResult =
  | { ok: true }
  | { ok: false; error: string };

export type AcceptAccountInvitationResult =
  | { ok: true; accountId: string }
  | {
      ok: false;
      error:
        | "expired"
        | "revoked"
        | "email_mismatch"
        | "invalid"
        | "already"
        | "not_business"
        | string;
    };

export type RemoveAccountMemberResult =
  | { ok: true }
  | { ok: false; error: string };

export type AccountMemberRow = {
  userId: string;
  email: string;
  createdAt: string;
};

export type PendingAccountInvitationRow = {
  id: string;
  email: string;
  expiresAt: string;
  createdAt: string;
};
