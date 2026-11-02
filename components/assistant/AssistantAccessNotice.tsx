import { ButtonLink } from "@/components/ui/button";
import {
  COUPLE_LIFETIME_PRICE,
  COUPLE_MONTHLY_PRICE,
  formatCouplePrice,
} from "@/lib/billing/couple-pricing";
import type { AssistantAccessSummary } from "@/lib/billing/assistant-budget";

/**
 * COUPLES-PIVOT part 3 — assistant plan messaging inside the panel.
 * The UI only ever sees a percent and dates, never dollar spend.
 */

function daysLeft(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** One quiet line under the panel header. Null when nothing to say. */
export function AssistantStatusLine({
  access,
}: {
  access: AssistantAccessSummary | null;
}) {
  if (!access) return null;

  let text: string | null = null;
  if (access.lockReason === "trial_available") {
    text = "Your first message starts a free 7-day assistant trial.";
  } else if (access.allowed && access.plan === "trial" && access.trialEndsAt) {
    const days = daysLeft(access.trialEndsAt);
    text =
      days <= 1
        ? "Free trial · last day"
        : `Free trial · ${days} days left`;
  } else if (
    access.allowed &&
    access.usedPercent !== null &&
    access.usedPercent >= 75
  ) {
    text = access.resetsAt
      ? `${access.usedPercent}% of this month's allowance used · resets ${formatShortDate(access.resetsAt)}`
      : `${access.usedPercent}% of your assistant allowance used`;
  }

  if (!text) return null;
  return (
    <p className="mt-2 inline-flex rounded-[var(--radius-pill)] bg-accent-wash px-2.5 py-1 text-[12px] font-semibold text-accent">
      {text}
    </p>
  );
}

/** Replaces the composer when the assistant is locked. */
export function AssistantLockedCard({
  access,
}: {
  access: AssistantAccessSummary;
}) {
  const monthly = formatCouplePrice(COUPLE_MONTHLY_PRICE);
  const lifetime = formatCouplePrice(COUPLE_LIFETIME_PRICE);

  if (access.lockReason === "limit_reached") {
    return (
      <div className="rounded-[var(--radius-inner)] bg-well px-4 py-4 shadow-recessed">
        <p className="text-[14px] font-semibold text-ink">
          You&apos;ve used this period&apos;s assistant allowance
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          {access.resetsAt
            ? `It resets on ${formatShortDate(access.resetsAt)}. Every planning tool keeps working in the meantime.`
            : "Every planning tool keeps working. Contact us if you need more assistant time."}
        </p>
        {access.resetsAt ? null : (
          <ButtonLink href="/contact" variant="default" className="mt-3">
            Contact us
          </ButtonLink>
        )}
      </div>
    );
  }

  if (!access.canUpgrade) {
    return (
      <div className="rounded-[var(--radius-inner)] bg-well px-4 py-4 shadow-recessed">
        <p className="text-[14px] font-semibold text-ink">
          The assistant isn&apos;t on this wedding&apos;s plan
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          The couple who owns this wedding can turn it on from their billing
          page.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-inner)] bg-well px-4 py-4 shadow-recessed">
      <p className="text-[14px] font-semibold text-ink">
        Your free assistant trial has ended
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
        Everything else stays free. Keep the assistant for {monthly}/month, or
        {" "}
        {lifetime} once for the rest of your planning.
      </p>
      <ButtonLink href="/account/billing" variant="primary" className="mt-3">
        Upgrade
      </ButtonLink>
    </div>
  );
}
