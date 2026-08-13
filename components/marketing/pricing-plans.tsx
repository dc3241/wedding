"use client";

import { ButtonLink } from "@/components/ui/button";
import {
  SegmentedToggle,
  SegmentedToggleItem,
} from "@/components/ui/topbar";
import { useState } from "react";

type Audience = "couples" | "planners";
type PlannerCadence = "monthly" | "annual";
type VenueCadence = "monthly" | "annual";
type CoupleCadence = "monthly" | "lifetime";

const COUPLE_MONTHLY_PRICE = 10;
const COUPLE_LIFETIME_PRICE = 99;

const COUPLE_FEATURES = [
  "Everything in Free",
  "Planning assistant & vendor outreach",
  "Full budget with vendor links",
  "Seating chart, RSVP & registry",
  "Photo-led website + custom RSVP",
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
const VENUE_MONTHLY_PRICE = 199;
const VENUE_ANNUAL_PRICE = 1999;
const VENUE_ANNUAL_SAVINGS = VENUE_MONTHLY_PRICE * 12 - VENUE_ANNUAL_PRICE;

const VENUE_FEATURES = [
  "Unlimited weddings & team seats",
  "Your venue's branding across the whole dashboard",
  "Every planning tool — budget, guests, seating, vendors, contracts, website builder",
  "Dedicated support getting set up",
] as const;

const TRIAL_FOOTER = "7-day free trial · no card to start · cancel anytime.";

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

/** PRICE-08: marketing couple card — real plan choice is post-login on billing. */
function CoupleCard() {
  const [cadence, setCadence] = useState<CoupleCadence>("monthly");
  const lifetime = cadence === "lifetime";

  return (
    <article className="relative flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-7 shadow-raised ring-2 ring-accent">
      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[var(--radius-pill)] bg-accent px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-surface uppercase">
        Most popular
      </span>
      <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        The full plan
      </h3>

      <div className="mt-4">
        <SegmentedToggle aria-label="Couple plan" className="w-full p-0.5">
          <SegmentedToggleItem
            active={cadence === "monthly"}
            aria-pressed={cadence === "monthly"}
            onClick={() => setCadence("monthly")}
            className="flex-1 px-3 py-1.5 text-[12px] font-semibold"
          >
            Monthly · ${COUPLE_MONTHLY_PRICE}
          </SegmentedToggleItem>
          <SegmentedToggleItem
            active={cadence === "lifetime"}
            aria-pressed={cadence === "lifetime"}
            onClick={() => setCadence("lifetime")}
            className="flex-1 px-3 py-1.5 text-[12px] font-semibold"
          >
            Lifetime · ${COUPLE_LIFETIME_PRICE}
          </SegmentedToggleItem>
        </SegmentedToggle>
      </div>

      <div className="mt-3">
        {lifetime ? (
          <p className="flex items-baseline gap-1.5">
            <span className="text-[40px] font-extrabold tracking-[-0.035em] tabular-nums text-ink">
              ${COUPLE_LIFETIME_PRICE}
            </span>
            <span className="text-[14px] font-medium text-muted">/ one-time</span>
          </p>
        ) : (
          <p className="flex items-baseline gap-1.5">
            <span className="text-[40px] font-extrabold tracking-[-0.035em] tabular-nums text-ink">
              ${COUPLE_MONTHLY_PRICE}
            </span>
            <span className="text-[14px] font-medium text-muted">/ month</span>
          </p>
        )}
      </div>

      <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-muted">
        {lifetime
          ? "Pay once, plan forever — no recurring charges."
          : "Full planning tools, billed monthly. Cancel anytime."}
      </p>
      <ButtonLink href="/login" variant="primary" className="mt-6 w-full">
        Start free trial
      </ButtonLink>
      <ul className="mt-6 space-y-3 border-t border-hairline pt-6">
        {COUPLE_FEATURES.map((f) => (
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

  return (
    <div>
      <div className="flex justify-center">
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

      <div
        className={
          audience === "couples"
            ? "mx-auto mt-10 grid max-w-md gap-6"
            : "mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2"
        }
      >
        {audience === "couples" ? (
          <CoupleCard />
        ) : (
          <>
            <PlannerCard />
            <VenueCard />
          </>
        )}
      </div>

      <p className="mx-auto mt-10 max-w-xl text-center text-[13px] font-medium text-muted">
        {TRIAL_FOOTER}
      </p>
    </div>
  );
}
