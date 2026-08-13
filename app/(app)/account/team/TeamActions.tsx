"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CopyInviteLink } from "@/app/(app)/projects/[projectId]/access/CopyInviteLink";
import {
  createAccountInvitation,
  removeAccountMember,
  revokeAccountInvitation,
} from "@/lib/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function mapInviteError(message: string): string {
  if (
    message.includes("23505") ||
    message.includes("duplicate key") ||
    message.includes("unique") ||
    message.includes("account_invitations_one_live")
  ) {
    return "There is already a pending invitation for this email";
  }
  return message;
}

export function TeamInviteForm({ accountId }: { accountId: string }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteUrl(null);

    startTransition(async () => {
      const result = await createAccountInvitation(accountId, email);
      if (!result.ok) {
        setError(mapInviteError(result.error));
        return;
      }

      setInviteUrl(
        `${window.location.origin}/invite/account/${result.token}`,
      );
      setEmail("");
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label
            htmlFor="team-invite-email"
            className="text-sm font-medium text-ink"
          >
            Email
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Input
              id="team-invite-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
              className="sm:flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={isPending}
              className="shrink-0"
            >
              {isPending ? "Sending…" : "Invite"}
            </Button>
          </div>
        </div>
        {error ? (
          <p className="text-[13px] text-rosewood" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {inviteUrl ? (
        <div className="space-y-2 rounded-[var(--radius-inner)] bg-well p-4 shadow-recessed">
          <p className="text-[13px] font-medium text-ink">Invite link</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <p className="min-w-0 flex-1 break-all text-[13px] text-muted">
              {inviteUrl}
            </p>
            <CopyInviteLink url={inviteUrl} />
          </div>
          <p className="text-[13px] text-muted">
            This link is shown once and cannot be retrieved later. If it is lost,
            revoke the invitation and issue a new one.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function RevokeAccountInvitationButton({
  invitationId,
}: {
  invitationId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await revokeAccountInvitation(invitationId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="shrink-0 text-right">
      <Button
        type="button"
        variant="ghost"
        disabled={isPending}
        onClick={handleClick}
        className="px-2 py-1 text-[13px] text-muted hover:text-rosewood"
      >
        {isPending ? "Revoking…" : "Revoke"}
      </Button>
      {error ? (
        <p className="text-[12px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RemoveAccountMemberButton({
  accountId,
  userId,
  label = "Remove",
}: {
  accountId: string;
  userId: string;
  label?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await removeAccountMember(accountId, userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="shrink-0 text-right">
      <Button
        type="button"
        variant="ghost"
        disabled={isPending}
        onClick={handleClick}
        className="px-2 py-1 text-[13px] text-muted hover:text-rosewood"
      >
        {isPending ? "Removing…" : label}
      </Button>
      {error ? (
        <p className="text-[12px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
