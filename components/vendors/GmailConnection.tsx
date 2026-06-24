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
    <section className="rounded-md border border-zinc-200 p-4">
      <h3 className="text-sm font-medium text-zinc-900">Gmail for outreach</h3>
      <p className="mt-1 text-xs text-zinc-500">
        Connect your mailbox so outreach sends from your own address. Replies
        land in your Gmail inbox.
      </p>

      {justConnected ? (
        <p className="mt-2 text-sm text-green-700">Gmail connected successfully.</p>
      ) : null}

      {errorMessage ? (
        <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {connectedEmail ? (
          <p className="text-sm text-zinc-700">
            Connected as <span className="font-medium">{connectedEmail}</span>
          </p>
        ) : (
          <Link
            href={connectHref}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Connect Gmail
          </Link>
        )}

        {connectedEmail ? (
          <Link
            href={connectHref}
            className="text-sm text-zinc-500 underline hover:text-zinc-700"
          >
            Reconnect
          </Link>
        ) : null}
      </div>
    </section>
  );
}
