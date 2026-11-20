"use client";

import {
  requestPlannerSession,
  type RequestSessionResult,
} from "@/app/(app)/account/planner-help/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PlannerSessionKind } from "@/lib/planner-sessions/catalog";
import { useActionState, useState } from "react";

export function RequestSessionForm({
  quick,
  full,
}: {
  quick: number;
  full: number;
}) {
  const initialKind: PlannerSessionKind = full > 0 ? "full" : "quick";
  const [kind, setKind] = useState<PlannerSessionKind>(initialKind);
  const [state, action, pending] = useActionState<
    RequestSessionResult | null,
    FormData
  >(requestPlannerSession, null);

  if (state?.ok) {
    return (
      <div className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed">
        <p className="text-[14px] font-medium text-ink">Request sent.</p>
        <p className="mt-1 text-[13px] text-muted">
          A planner will email you within one business day to confirm a time
          and send the Zoom link.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {quick > 0 && full > 0 ? (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 text-[13px] font-medium text-ink">
            Session length
          </legend>
          {(
            [
              ["full", `60 minutes (${full} left)`],
              ["quick", `30 minutes (${quick} left)`],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold ${
                kind === value
                  ? "border-accent bg-accent-wash text-ink"
                  : "border-hairline text-muted"
              }`}
            >
              <input
                type="radio"
                name="kind_choice"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </fieldset>
      ) : null}
      <input type="hidden" name="kind" value={kind} />

      <label className="block">
        <span className="text-[13px] font-medium text-ink">
          What do you want help with?
        </span>
        <Textarea
          name="question"
          required
          minLength={10}
          maxLength={4000}
          rows={4}
          className="mt-1.5"
          placeholder="e.g. Our catering quote came in $4,000 over budget and we're not sure what to cut."
        />
      </label>

      <label className="block">
        <span className="text-[13px] font-medium text-ink">
          Times that work for you{" "}
          <span className="font-normal text-muted">(optional)</span>
        </span>
        <Textarea
          name="preferred_times"
          maxLength={1000}
          rows={2}
          className="mt-1.5"
          placeholder="e.g. Weekday evenings after 6pm Arizona time"
        />
      </label>

      {state && !state.ok ? (
        <p className="text-[13px] text-rosewood">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Request a session"}
      </Button>
    </form>
  );
}
