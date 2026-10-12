"use client";

import { useFormStatus } from "react-dom";

/**
 * Tier 1 demo indicator — one mount site in app layout (not forked per shell).
 * Neutral well strip — not berry. Exit signs out the anonymous session
 * and returns to the marketing homepage.
 */
function ExitDemoButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="cursor-pointer text-[13px] font-semibold text-accent underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-default disabled:opacity-50 disabled:hover:no-underline"
    >
      {pending ? "Exiting…" : "Exit demo"}
    </button>
  );
}

export function DemoBanner() {
  return (
    <div
      role="status"
      className="border-b border-hairline bg-well px-6 py-2.5 md:px-8"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
        <p className="text-[13px] font-medium text-ink">
          You&apos;re exploring a demo.
        </p>
        <form action="/logout" method="post">
          <ExitDemoButton />
        </form>
      </div>
    </div>
  );
}
