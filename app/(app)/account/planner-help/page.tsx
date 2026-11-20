import { redirect } from "next/navigation";
import {
  cancelPlannerSession,
  createPlannerHelpCheckout,
} from "@/app/(app)/account/planner-help/actions";
import { RequestSessionForm } from "@/components/planner-help/request-session-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pill, type PillVariant } from "@/components/ui/pill";
import { getAccountContext } from "@/lib/account-context";
import { shellLayoutClass } from "@/lib/density";
import {
  PLANNER_OFFERS,
  PLANNER_SESSION_RULES,
  SESSION_MINUTES,
} from "@/lib/planner-sessions/catalog";
import {
  loadPlannerHelp,
  reconcilePlannerCheckoutReturn,
  type PlannerSessionRow,
} from "@/lib/planner-sessions/grants";
import { createClient } from "@/utils/supabase/server";

const STATUS_LABEL: Record<
  PlannerSessionRow["status"],
  { label: string; variant: PillVariant }
> = {
  requested: { label: "Requested", variant: "clay" },
  scheduled: { label: "Scheduled", variant: "accent" },
  completed: { label: "Done", variant: "sage" },
  no_show: { label: "Missed", variant: "rosewood" },
  canceled: { label: "Canceled", variant: "default" },
};

function formatDate(iso: string | null, withTime = false) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime
      ? { hour: "numeric", minute: "2-digit", timeZoneName: "short" }
      : {}),
  });
}

function canCancel(s: PlannerSessionRow) {
  if (s.status === "requested") return true;
  return (
    s.status === "scheduled" &&
    s.scheduled_at !== null &&
    new Date(s.scheduled_at).getTime() > Date.now() + 24 * 3_600_000
  );
}

export default async function PlannerHelpPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; session_id?: string; error?: string }>;
}) {
  const { status, session_id, error } = await searchParams;
  const supabase = await createClient();
  const account = await getAccountContext(supabase);
  if (!account) redirect("/projects");
  if (account.kind !== "personal") redirect("/dashboard");

  if (status === "success") {
    await reconcilePlannerCheckoutReturn(account.accountId, session_id);
  }

  const { balance, sessions, support } = await loadPlannerHelp(
    supabase,
    account.accountId,
  );
  const credits = balance.quick + balance.full;
  const shellClass = shellLayoutClass(account.kind, false, "reading");
  const visibleOffers = PLANNER_OFFERS.filter(
    (offer) => !(offer.recurring && support.active),
  );

  return (
    <div className={shellClass}>
      <PageHeader
        eyebrow="Account"
        title="Talk to a planner"
        description="Book a Zoom call with a real wedding planner when you're stuck on something the app can't sort out for you."
      />

      {status === "success" && credits === 0 ? (
        <Card className="mt-6 px-4 py-3">
          <p className="text-[14px] text-muted">
            Thanks — we&apos;re adding your session. Refresh in a few seconds
            if it hasn&apos;t appeared yet.
          </p>
        </Card>
      ) : null}
      {status === "cancelled" ? (
        <Card className="mt-6 px-4 py-3">
          <p className="text-[14px] text-muted">Checkout was cancelled.</p>
        </Card>
      ) : null}
      {error ? (
        <Card className="mt-6 px-4 py-3">
          <p className="text-[14px] text-rosewood">
            {error === "late_cancel"
              ? "Sessions can only be cancelled 24 hours or more before they start."
              : "Couldn't cancel that session. Please try again."}
          </p>
        </Card>
      ) : null}

      <Card className="mt-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-medium text-ink">Your sessions</h2>
            <p className="mt-1 text-[13px] text-muted">
              {credits === 0
                ? "No sessions available yet. Pick an option below to book."
                : [
                    balance.full
                      ? `${balance.full} × 60-minute`
                      : null,
                    balance.quick
                      ? `${balance.quick} × 30-minute`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") +
                  (balance.nextExpiry
                    ? ` — next expires ${formatDate(balance.nextExpiry)}`
                    : "")}
            </p>
          </div>
          {support.active ? (
            <div className="text-right">
              <Pill variant="sage">Monthly support</Pill>
              {support.currentPeriodEnd ? (
                <p className="mt-1 text-[12px] text-muted">
                  {support.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
                  {formatDate(support.currentPeriodEnd)} · manage in Billing
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {credits > 0 ? (
          <div className="mt-5 border-t border-hairline pt-5">
            <RequestSessionForm quick={balance.quick} full={balance.full} />
          </div>
        ) : null}

        {sessions.length > 0 ? (
          <ul className="mt-6 space-y-3 border-t border-hairline pt-5">
            {sessions.map((s) => {
              const st = STATUS_LABEL[s.status];
              return (
                <li
                  key={s.id}
                  className="rounded-[var(--radius-inner)] bg-well px-4 py-3 shadow-recessed"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Pill variant={st.variant}>{st.label}</Pill>
                      <span className="text-[13px] text-muted">
                        {SESSION_MINUTES[s.session_kind]} min ·{" "}
                        {s.scheduled_at
                          ? formatDate(s.scheduled_at, true)
                          : `requested ${formatDate(s.created_at)}`}
                      </span>
                    </div>
                    {canCancel(s) ? (
                      <form action={cancelPlannerSession}>
                        <input type="hidden" name="sessionId" value={s.id} />
                        <button
                          type="submit"
                          className="text-[13px] font-medium text-muted hover:text-rosewood"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[14px] text-ink">{s.question}</p>
                  {s.status === "scheduled" && s.meeting_url ? (
                    <a
                      href={s.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-[14px] font-semibold text-accent"
                    >
                      Join Zoom call →
                    </a>
                  ) : null}
                  {s.recap ? (
                    <div className="mt-3 border-t border-hairline pt-3">
                      <p className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">
                        Recap
                      </p>
                      <p className="mt-1 text-[14px] whitespace-pre-wrap text-ink">
                        {s.recap}
                      </p>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Card>

      <h2 className="mt-10 text-[15px] font-medium text-ink">
        {credits > 0 ? "Add more sessions" : "Choose an option"}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {visibleOffers.map((offer) => (
          <Card key={offer.id} className="flex flex-col p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-ink">
                {offer.name}
              </h3>
              <span className="text-[20px] font-extrabold text-ink tabular-nums">
                {offer.priceLabel}
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted">{offer.cadence}</p>
            <p className="mt-3 text-[14px] text-ink">{offer.summary}</p>
            <ul className="mt-3 space-y-1 text-[13px] text-muted">
              {offer.bullets.map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
            <form action={createPlannerHelpCheckout} className="mt-auto pt-5">
              <input type="hidden" name="offer" value={offer.id} />
              <Button
                type="submit"
                variant={offer.id === "single" ? "primary" : "default"}
                className="w-full"
              >
                {offer.recurring ? "Subscribe" : "Buy"}
              </Button>
            </form>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <h2 className="text-[15px] font-medium text-ink">How it works</h2>
        <ul className="mt-3 space-y-1.5 text-[13px] text-muted">
          {PLANNER_SESSION_RULES.map((rule) => (
            <li key={rule}>· {rule}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
