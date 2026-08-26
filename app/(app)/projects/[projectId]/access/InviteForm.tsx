"use client";

import { useState, useTransition } from "react";
import { CopyInviteLink } from "./CopyInviteLink";
import {
  createProjectInvitation,
} from "@/lib/invitations/actions";
import type { ProjectInviteRole } from "@/lib/invitations/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function mapInviteError(message: string): string {
  if (
    message.includes("23505") ||
    message.includes("duplicate key") ||
    message.includes("unique") ||
    message.includes("project_invitations_one_live")
  ) {
    return "There is already a pending invitation for this email";
  }
  return message;
}

export function InviteForm({
  projectId,
  role,
  emailId,
  placeholder,
  submitLabel = "Invite",
}: {
  projectId: string;
  role: ProjectInviteRole;
  emailId: string;
  placeholder?: string;
  submitLabel?: string;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<{
    email: string;
    url: string;
    emailSent: boolean;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInviteSuccess(null);

    const invitedEmail = email.trim();
    startTransition(async () => {
      const result = await createProjectInvitation(
        projectId,
        invitedEmail,
        role,
      );
      if (!result.ok) {
        setError(mapInviteError(result.error));
        return;
      }

      setInviteSuccess({
        email: invitedEmail,
        url: `${window.location.origin}/invite/${result.token}`,
        emailSent: result.emailSent,
      });
      setEmail("");
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor={emailId} className="text-sm font-medium text-ink">
            Email
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Input
              id={emailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder={placeholder}
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
              {isPending ? "Sending…" : submitLabel}
            </Button>
          </div>
        </div>
        {error ? (
          <p className="text-[13px] text-rosewood" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {inviteSuccess ? (
        <div className="space-y-2 rounded-[var(--radius-inner)] bg-well p-4 shadow-recessed">
          <p className="text-[13px] font-medium text-ink">
            {inviteSuccess.emailSent
              ? `Invite sent to ${inviteSuccess.email}`
              : "Invite created — email didn't send, share this link"}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <p className="min-w-0 flex-1 break-all text-[13px] text-muted">
              {inviteSuccess.url}
            </p>
            <CopyInviteLink url={inviteSuccess.url} />
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
