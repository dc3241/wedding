"use client";

import { submitAdvertiseInquiry } from "@/app/advertise/actions";
import { ADVERTISE_INTERESTS } from "@/app/advertise/interests";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";

const fieldClass =
  "w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-3.5 py-2.5 text-[15px] font-medium text-ink placeholder:text-muted";

export function AdvertiseForm() {
  const [state, setState] = useState<"idle" | "done" | "invalid" | "send_failed">("idle");
  const [pending, startTransition] = useTransition();

  if (state === "done") {
    return (
      <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised">
        <p className="text-[16px] font-bold text-ink">Thanks, we got it.</p>
        <p className="mt-1 text-[14.5px] text-muted">We&apos;ll reply from hello@usefirstlook.app within two business days.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await submitAdvertiseInquiry(fd);
          setState(r.ok ? "done" : r.reason);
        });
      }}
      className="grid gap-3 rounded-[var(--radius-card)] bg-surface p-6 shadow-raised md:grid-cols-2"
    >
      <div className="absolute -left-[9999px]" aria-hidden>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label>
        <span className="text-[13px] font-semibold text-ink">Your name</span>
        <input name="name" required maxLength={120} className={fieldClass} />
      </label>
      <label>
        <span className="text-[13px] font-semibold text-ink">Business</span>
        <input name="business" required maxLength={160} className={fieldClass} />
      </label>
      <label>
        <span className="text-[13px] font-semibold text-ink">Email</span>
        <input name="email" type="email" required maxLength={254} className={fieldClass} />
      </label>
      <label>
        <span className="text-[13px] font-semibold text-ink">Interested in</span>
        <select name="interest" defaultValue="featured" className={fieldClass}>
          {Object.entries(ADVERTISE_INTERESTS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="md:col-span-2">
        <span className="text-[13px] font-semibold text-ink">Anything we should know? (optional)</span>
        <textarea name="message" rows={4} maxLength={4000} className={fieldClass} />
      </label>
      <div className="flex flex-wrap items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </Button>
        {state === "invalid" ? (
          <span className="text-[13.5px] font-medium text-rosewood">Check your name, business and email.</span>
        ) : null}
        {state === "send_failed" ? (
          <span className="text-[13.5px] font-medium text-rosewood">
            That didn&apos;t send. Email hello@usefirstlook.app instead.
          </span>
        ) : null}
      </div>
    </form>
  );
}
