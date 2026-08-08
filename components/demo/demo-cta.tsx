"use client";

import { startDemo, type DemoAccountKind } from "@/lib/demo/start-demo";
import { cn } from "@/lib/cn";
import { useState } from "react";

export function DemoCta({ kind }: { kind: DemoAccountKind }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    if (pending) return;
    setPending(true);
    setMessage(null);

    const result = await startDemo(kind);

    if (result.status === "unavailable") {
      setMessage(
        "Demo isn't available right now. Check back soon — or sign up to start for real.",
      );
      setPending(false);
      return;
    }

    if (result.status === "error") {
      setMessage(result.message || "Something went wrong. Try again.");
      setPending(false);
      return;
    }

    // ok | existing — startDemo navigates; keep pending until unload
  }

  return (
    <div className="mt-5 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 text-[14px] font-semibold text-accent",
          "transition-opacity hover:opacity-80",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-wait disabled:opacity-60",
        )}
      >
        {pending ? (
          <>
            <span
              className="size-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent"
              aria-hidden
            />
            Opening demo…
          </>
        ) : (
          <>
            See it with a live demo
            <span aria-hidden>
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10h12M11 5l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </>
        )}
      </button>
      <p className="max-w-[40ch] text-[13px] leading-relaxed text-muted">
        No signup required — explore a real workspace, then keep it if you like
        it.
      </p>
      {message ? (
        <p
          role="alert"
          className="max-w-[40ch] text-[13px] leading-relaxed text-rosewood"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
