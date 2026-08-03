import Link from "next/link";

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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
      {connectedEmail ? (
        <>
          <span className="rounded-[var(--radius-pill)] bg-well px-3 py-1.5 font-medium text-ink shadow-recessed">
            Gmail · {connectedEmail}
          </span>
          <Link
            href={connectHref}
            className="font-semibold text-accent hover:opacity-80"
          >
            Reconnect
          </Link>
        </>
      ) : (
        <Link
          href={connectHref}
          className="rounded-[var(--radius-pill)] bg-well px-3 py-1.5 font-semibold text-ink shadow-recessed hover:text-accent"
        >
          Connect Gmail for outreach
        </Link>
      )}

      {justConnected ? (
        <span className="font-medium text-sage">Connected</span>
      ) : null}

      {errorMessage ? (
        <span className="font-medium text-rosewood">{errorMessage}</span>
      ) : null}
    </div>
  );
}
