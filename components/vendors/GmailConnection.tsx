import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

export function GmailConnection({
  connectedEmail,
  returnTo,
  errorMessage,
  justConnected,
}: {
  connectedEmail: string | null;
  returnTo: string;
  errorMessage?: string | null;
  justConnected?: boolean;
}) {
  const connectHref = `/auth/google?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <Card className="px-6 py-5">
      <Eyebrow>Gmail</Eyebrow>
      <h3 className="mt-1.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Outreach mailbox
      </h3>
      <p className="mt-1 text-[13px] text-muted">
        Connect your mailbox so outreach sends from your own address. Replies
        land in your Gmail inbox.
      </p>

      {justConnected ? (
        <p className="mt-3 text-[13px] text-sage">Gmail connected successfully.</p>
      ) : null}

      {errorMessage ? (
        <p className="mt-3 text-sm text-rosewood">{errorMessage}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {connectedEmail ? (
          <p className="text-sm text-ink">
            Connected as{" "}
            <span className="font-medium">{connectedEmail}</span>
          </p>
        ) : (
          <ButtonLink href={connectHref} variant="primary">
            Connect Gmail
          </ButtonLink>
        )}

        {connectedEmail ? (
          <Link
            href={connectHref}
            className="text-[13px] font-semibold text-accent hover:opacity-80"
          >
            Reconnect
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
