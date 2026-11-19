"use client";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";
import { subscribeToNewsletter } from "@/lib/newsletter/actions";
import { useState, useTransition } from "react";

type State = "idle" | "done" | "invalid" | "throttled" | "error";

const fieldClass =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink placeholder:text-muted";

const MESSAGES: Record<Exclude<State, "idle" | "done">, string> = {
  invalid: "That email doesn't look right. Check it and try again.",
  throttled: "Too many tries from here. Wait a few minutes and try again.",
  error: "Something went wrong on our end. Try again in a moment.",
};

/**
 * MEDIA-02: one weekly planning email, timed to the wedding date.
 * `source` records where the signup happened (e.g. "home", "tool:alcohol").
 */
export function NewsletterSignup({
  source,
  className,
  compact = false,
}: {
  source: string;
  className?: string;
  compact?: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await subscribeToNewsletter(formData);
      setState(result.ok ? "done" : result.reason);
    });
  }

  return (
    <section
      className={cn(
        "rounded-[var(--radius-card)] bg-surface p-6 shadow-raised md:p-8",
        className,
      )}
      aria-labelledby={`newsletter-${source}`}
    >
      <Eyebrow className="mb-3 block">The First Look letter</Eyebrow>
      <h2
        id={`newsletter-${source}`}
        className={cn(
          "font-extrabold tracking-[-0.02em] text-ink",
          compact ? "text-[20px]" : "text-[24px] md:text-[28px]",
        )}
      >
        One planning email a week, timed to your date.
      </h2>
      <p className="mt-2 max-w-[56ch] text-[14.5px] leading-relaxed text-muted">
        What to book this month, what it should cost, and what couples forget. Free, and you can
        unsubscribe anytime.
      </p>

      {state === "done" ? (
        <p className="mt-5 rounded-[var(--radius-inner)] bg-well px-4 py-3 text-[14.5px] font-semibold text-ink shadow-recessed">
          You&apos;re in. Your first email is on its way soon.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input type="hidden" name="source" value={source} />
          <div className="absolute -left-[9999px]" aria-hidden>
            <label>
              Company
              <input type="text" name="company" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label className="sr-only" htmlFor={`nl-email-${source}`}>
            Email
          </label>
          <input
            id={`nl-email-${source}`}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@email.com"
            className={fieldClass}
          />
          <label className="sr-only" htmlFor={`nl-date-${source}`}>
            Wedding date (optional)
          </label>
          <input
            id={`nl-date-${source}`}
            name="wedding_date"
            type="date"
            title="Wedding date (optional)"
            className={fieldClass}
          />
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Joining…" : "Join free"}
          </Button>
          {state !== "idle" ? (
            <p className="text-[13.5px] font-medium text-rosewood sm:col-span-3" role="alert">
              {MESSAGES[state]}
            </p>
          ) : (
            <p className="text-[12.5px] text-muted sm:col-span-3">
              Wedding date is optional. It lets us send the right email at the right time.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
