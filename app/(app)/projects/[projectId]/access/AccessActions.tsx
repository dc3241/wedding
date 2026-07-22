"use client";

import { useState, useTransition } from "react";
import {
  removeProjectMember,
  revokeProjectInvitation,
} from "@/lib/invitations/actions";
import { Button } from "@/components/ui/button";

export function RevokeInvitationButton({
  invitationId,
}: {
  invitationId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await revokeProjectInvitation(invitationId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
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

export function RemoveAccessButton({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await removeProjectMember(projectId, userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
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
        {isPending ? "Removing…" : "Remove"}
      </Button>
      {error ? (
        <p className="text-[12px] text-rosewood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
