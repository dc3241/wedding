"use client";

import { ButtonLink } from "@/components/ui/button";
import {
  SegmentedToggle,
  SegmentedToggleItem,
} from "@/components/ui/topbar";
import {
  COUPLE_LIFETIME_PRICE,
  COUPLE_MONTHLY_PRICE,
  formatCouplePrice,
} from "@/lib/billing/couple-pricing";
import { B2B_MARKETING_ENABLED } from "@/lib/marketing-flags";
import { useState } from "react";

type Audience = "couples" | "planners";
type PlannerCadence = "monthly" | "annual";
type VenueCadence = "monthly" | "annual";
type CoupleCadence = "monthly" | "lifetime";

/** COUPLES-PIVOT: every planning tool is free; the assistant is the upgrade. */
const COUPLE_FREE_FEATURES = [
  "Wedding checklist & calendar",
  "Budget tracker & payment log",
  "Guest list with online RSVP",
  "Seating chart",
  "Vendor search & tracking",
  "Wedding website",
  "Printable day-of timeline",
] as const;

const COUPLE_ASSISTANT_FEATURES = [
  "Everything in Free",
  "The planning assistant on every page",
  "Updates tasks, budget & guests for you",
  "Weekly planning summary by email",
  "Heads-up when something needs attention",
  "Vendor emails drafted for you to approve",
] as const;

/** Planner list prices — presentation only; Stripe objects land in PRICE-02. */
const PLANNER_MONTHLY_PRICE = 59;
const PLANNER_ANNUAL_PRICE = 590;
// annualizedMonthly = monthlyPrice*12   → 708
const PLANNER_ANNUALIZED_MONTHLY = PLANNER_MONTHLY_PRICE * 12;
// savings           = monthlyPrice*12 - annualPrice → 118
const PLANNER_ANNUAL_SAVINGS =
  PLANNER_ANNUALIZED_MONTHLY - PLANNER_ANNUAL_PRICE;
const PLANNER_ANNUAL_EFFECTIVE_MONTHLY = Math.round(
  PLANNER_ANNUAL_PRICE / 12,
);

const PLANNER_FEATURES = [
  "Unlimited active weddings",
  "All couple tools per client",
  "White-label branding",
  "Lead pipeline & proposals",
  "Printable contracts",
  "Team seats",
  "Priority support",
] as const;

/** Venue list prices — presentation only; Checkout is post-login on /account/venue-upgrade. */
const VENUE_MONTHLY_PRICE = 149;
const VENUE_ANNUAL_PRICE = 1499;
const VENUE_ANNUAL_SAVINGS = VENUE_MONTHLY_PRICE * 12 - VENUE_ANNUAL_PRICE;

const VENUE_FEATURES = [
  "Unlimited weddings & team seats",
  "Your venue's branding across the whole dashboard",
  "Every planning tool — budget, guests, seating, vendors, contracts, website builder",
  "Dedicated support getting set up",
] as const;

const PLANNER_FOOTER = "7-day free trial · no card to start · cancel anytime.";
const COUPLE_FOOTER =
  "Free to plan · 7-day assistant trial, no card required · cancel anytime.";

function FeatureTick({ children }: { children: string }) {
  return (
    <li className="flex gap-2.5 text-[14px] leading-snug text-ink">
      <span
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-wash text-[12px] font-bold text-accent"
        aria-hidden
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function CoupleFreeCard() {
  return (
    <article className="relative flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-7 shadow-raised">
      <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Free
      </h3>
      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="text-[40px] font-extrabold tracking-[-0.035em] tabular-nums text-ink">
          $0
        </span>
        <span className="text-[14px] font-medium text-muted">/ forever</span>
      </p>
      <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-muted">
        Every tool you need to plan the wedding yourself. No card, no trial
        clock.
      </p>
      <ButtonLink href="/login" variant="default" className="mt-6 w-full">
        Start planning free
      </ButtonLink>
      <ul className="mt-6 space-y-3 border-t border-hairline pt-6">
        {COUPLE_FREE_FEATURES.map((f) => (
          <FeatureTick key={f}>{f}</FeatureTick>
        ))}
      </ul>
    </article>
  );
}

/** Marketing card only — real Checkout is post-login on /account/billing. */
function CoupleAssistantCard() {
  const [cadence, setCadence] = useState<CoupleCadence>("monthly");
  const lifetime = cadence === "lifetime";
  const monthly = formatCouplePrice(COUPLE_MONTHLY_PRICE);
  const once = formatCouplePrice(COUPLE_LIFETIME_PRICE);

  return (
    <article className="relative flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-7 shadow-raised ring-2 ring-accent">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[var(--radius-pill)] bg-accent px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-surface uppercase">
        Most help
      </span>
      <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Free + Assistant
      </h3>

      <div className="mt-4">
        <SegmentedToggle aria-label="Assistant plan" className="w-full p-0.5">
          <SegmentedToggleItem
            active={cadence === "monthly"}
            aria-pressed={cadence === "monthly"}
            onClick={() => setCadence("monthly")}
            className="flex-1 px-3 py-1.5 text-[12px] font-semibold"
          >
            Monthly · {monthly}
          </SegmentedToggleItem>
          <SegmentedToggleItem
            active={cadence === "lifetime"}
            aria-pressed={cadence === "lifetime"}
            onClick={() => setCadence("lifetime")}
            className="flex-1 px-3 py-1.5 text-[12px] font-semibold"
          >
            Lifetime · {once}
          </SegmentedToggleItem>
        </SegmentedToggle>
      </div>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[40px] font-extrabold tracking-[-0.035em] tabular-nums text-ink">
          {lifetime ? once : monthly}
        </span>
        <span className="text-[14px] font-medium text-muted">
          {lifetime ? "/ one-time" : "/ month"}
        </span>
      </p>

      <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-muted">
        {lifetime
          ? "Try it free for 7 days, then pay once and keep the assistant for the whole engagement."
          : "Try it free for 7 days, then keep it for help doing the work. Cancel anytime."}
      </p>
      <ButtonLink href="/login" variant="primary" className="mt-6 w-full">
        Try the assistant free
      </ButtonLink>
      <ul className="mt-6 space-y-3 border-t border-hairline pt-6">
        {COUPLE_ASSISTANT_FEATURES.map((f) => (
          <FeatureTick key={f}>{f}</FeatureTick>
        ))}
      </ul>
    </article>
  );
}

/** Cadence lives here only — couples never mount this card, so no page-level guard. */
function PlannerCard() {
  const [cadence, setCadence] = useState<PlannerCadence>("monthly");
  const annual = cadence === "annual";

  return (
    <article className="relative flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-7 shadow-raised ring-2 ring-accent">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[var(--radius-pill)] bg-accent px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-surface uppercase">
        Most popular
      </span>
      <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Planner
      </h3>

      <div className="mt-4">
        <SegmentedToggle aria-label="Billing cadence" className="w-fit p-0.5">
          <SegmentedToggleItem
            active={cadence === "monthly"}
            aria-pressed={cadence === "monthly"}
            onClick={() => setCadence("monthly")}
            className="px-3 py-1 text-[12px] font-semibold"
          >
            Monthly
          </SegmentedToggleItem>
          <SegmentedToggleItem
            active={cadence === "annual"}
            aria-pressed={cadence === "annual"}
            onClick={() => setCadence("annual")}
            className="px-3 py-1 text-[12px] font-semibold"
          >
            Annual
          </SegmentedToggleItem>
        </SegmentedToggle>
      </div>

      <div className="mt-3">
        {annual ? (
          <>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="text-[18px] font-semibold tabular-nums text-muted line-through">
                ${PLANNER_ANNUALIZED_MONTHLY}
              </span>
              <span className="text-[40px] font-extrabold tracking-[-0.035em] tabular-nums text-ink">
                ${PLANNER_ANNUAL_PRICE}
              </span>
              <span className="text-[14px] font-medium text-muted">/ year</span>
              <span className="rounded-[var(--radius-pill)] bg-accent-wash px-2.5 py-1 text-[13px] font-semibold text-accent">
                Save ${PLANNER_ANNUAL_SAVINGS}
              </span>
            </div>
            <p className="mt-1.5 text-[13px] font-medium text-muted">
              ${PLANNER_ANNUAL_EFFECTIVE_MONTHLY}/mo, billed annually
            </p>
          </>
        ) : (
          <p className="flex items-baseline gap-1.5">
            <span className="text-[40px] font-extrabold tracking-[-0.035em] tabular-nums text-ink">
              ${PLANNER_MONTHLY_PRICE}
            </span>
            <span className="text-[14px] font-medium text-muted">/ month</span>
          </p>
        )}
      </div>

      <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-muted">
        One flat price, unlimited weddings.
      </p>
      {/* PRICE-02: billing page wires Monthly/Annual Checkout; marketing CTA still trial → login. */}
      <ButtonLink href="/login" variant="primary" className="mt-6 w-full">
        Start free trial
      </ButtonLink>
      <ul className="mt-6 space-y-3 border-t border-hairline pt-6">
        {PLANNER_FEATURES.map((f) => (
          <FeatureTick key={f}>{f}</FeatureTick>
        ))}
      </ul>
    </article>
  );
}

/** VENUE-03b: cosmetic Monthly/Annual — real Checkout is post-login on /account/venue-upgrade. */
function VenueCard() {
  const [cadence, setCadence] = useState<VenueCadence>("monthly");
  const annual = cadence === "annual";

  return (
    <article className="relative flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-7 shadow-raised">
      <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        Venue
      </h3>

      <div className="mt-4">
        <SegmentedToggle aria-label="Venue billing cadence" className="w-fit p-0.5">
          <SegmentedToggleItem
            active={cadence === "monthly"}
            aria-pressed={cadence === "monthly"}
            onClick={() => setCadence("monthly")}
            className="px-3 py-1 text-[12px] font-semibold"
          >
            Monthly
          </SegmentedToggleItem>
          <SegmentedToggleItem
            active={cadence === "annual"}
            aria-pressed={cadence === "annual"}
            onClick={() => setCadence("annual")}
            className="px-3 py-1 text-[12px] font-semibold"
          >
            Annual
          </SegmentedToggleItem>
        </SegmentedToggle>
      </div>

      <div className="mt-3">
        {annual ? (
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-[40px] font-extrabold tracking-[-0.035em] tabular-nums text-ink">
              ${VENUE_ANNUAL_PRICE.toLocaleString("en-US")}
            </span>
            <span className="text-[14px] font-medium text-muted">/ year</span>
            <span className="rounded-[var(--radius-pill)] bg-accent-wash px-2.5 py-1 text-[13px] font-semibold text-accent">
              Save ${VENUE_ANNUAL_SAVINGS}/yr
            </span>
          </div>
        ) : (
          <p className="flex items-baseline gap-1.5">
            <span className="text-[40px] font-extrabold tracking-[-0.035em] tabular-nums text-ink">
              ${VENUE_MONTHLY_PRICE}
            </span>
            <span className="text-[14px] font-medium text-muted">/ month</span>
          </p>
        )}
      </div>

      <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-muted">
        For venues running weddings with their own planning team.
      </p>
      <ButtonLink href="/login" variant="primary" className="mt-6 w-full">
        Get started
      </ButtonLink>
      <ul className="mt-6 space-y-3 border-t border-hairline pt-6">
        {VENUE_FEATURES.map((f) => (
          <FeatureTick key={f}>{f}</FeatureTick>
        ))}
      </ul>
    </article>
  );
}

export function PricingPlans() {
  const [audience, setAudience] = useState<Audience>("couples");
  // COUPLES-PIVOT: planner/venue cards only when B2B marketing is on.
  const showCouples = !B2B_MARKETING_ENABLED || audience === "couples";

  return (
    <div>
      {B2B_MARKETING_ENABLED ? (
        <div className="mb-10 flex justify-center">
          <SegmentedToggle aria-label="Pricing audience">
            <SegmentedToggleItem
              active={audience === "couples"}
              aria-pressed={audience === "couples"}
              onClick={() => setAudience("couples")}
              className="px-5 py-2.5 text-[14px] font-semibold"
            >
              For couples
            </SegmentedToggleItem>
            <SegmentedToggleItem
              active={audience === "planners"}
              aria-pressed={audience === "planners"}
              onClick={() => setAudience("planners")}
              className="px-5 py-2.5 text-[14px] font-semibold"
            >
              For planners
            </SegmentedToggleItem>
          </SegmentedToggle>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        {showCouples ? (
          <>
            <CoupleFreeCard />
            <CoupleAssistantCard />
          </>
        ) : (
          <>
            <PlannerCard />
            <VenueCard />
          </>
        )}
      </div>

      <p className="mx-auto mt-10 max-w-xl text-center text-[13px] font-medium text-muted">
        {showCouples ? COUPLE_FOOTER : PLANNER_FOOTER}
      </p>
    </div>
  );
}
