"use client";

import { ButtonLink } from "@/components/ui/button";
import {
  SegmentedToggle,
  SegmentedToggleItem,
} from "@/components/ui/topbar";
import { cn } from "@/lib/cn";
import { useState } from "react";

type Audience = "couples" | "planners";
type Cadence = "monthly" | "annual";

type Plan = {
  name: string;
  price: string;
  period?: string;
  description: string;
  cta: { label: string; href: string; variant: "default" | "primary" };
  features: string[];
  popular?: boolean;
};

const COUPLE_PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to start planning the day you get engaged.",
    cta: { label: "Start free", href: "/signup", variant: "default" },
    features: [
      "AI starter plan from your date & budget",
      "Checklist & day-of timeline",
      "Guest list & basic budget",
      "One wedding website",
    ],
  },
  {
    name: "The full plan",
    price: "$99",
    period: "one-time",
    description: "Try 7 days for $7 — applied to your $99.",
    // TODO PRICE-02: route to $7 trial checkout ($7 → credit toward $99).
    cta: { label: "Start your $7 week", href: "/signup", variant: "primary" },
    features: [
      "Everything in Free",
      "AI planning assistant & vendor outreach",
      "Full budget with vendor links",
      "Seating chart, RSVP & registry",
      "Photo-led website + custom RSVP",
    ],
    popular: true,
  },
];

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
  "Lead pipeline & proposals",
  "Printable contracts",
  "Team seats",
  "Priority support",
] as const;

const AGENCY_PLAN: Plan = {
  name: "Agency",
  price: "Let's talk",
  description: "For large teams and franchises with custom needs and volume.",
  // TODO: replace with real sales inbox once domain mail is live
  cta: {
    label: "Contact sales",
    href: "mailto:hello@firstlook.app",
    variant: "default",
  },
  features: [
    "Unlimited weddings & seats",
    "Custom branding",
    "Onboarding & migration help",
    "Dedicated account manager",
  ],
};

const FOOTER: Record<Audience, string> = {
  couples: "7 days for $7 · applied to your $99 · keep everything you build.",
  planners: "14-day free trial · no card to start · cancel anytime.",
};

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

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-7 shadow-raised",
        plan.popular && "ring-2 ring-accent",
      )}
    >
      {plan.popular ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-[var(--radius-pill)] bg-accent px-3 py-1 text-[11px] font-semibold tracking-[0.06em] text-surface uppercase">
          Most popular
        </span>
      ) : null}
      <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
        {plan.name}
      </h3>
      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[40px] font-extrabold tracking-[-0.035em] tabular-nums text-ink">
          {plan.price}
        </span>
        {plan.period ? (
          <span className="text-[14px] font-medium text-muted">/ {plan.period}</span>
        ) : null}
      </p>
      <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-muted">
        {plan.description}
      </p>
      <ButtonLink
        href={plan.cta.href}
        variant={plan.cta.variant}
        className="mt-6 w-full"
      >
        {plan.cta.label}
      </ButtonLink>
      <ul className="mt-6 space-y-3 border-t border-hairline pt-6">
        {plan.features.map((f) => (
          <FeatureTick key={f}>{f}</FeatureTick>
        ))}
      </ul>
    </article>
  );
}

/** Cadence lives here only — couples never mount this card, so no page-level guard. */
function PlannerCard() {
  const [cadence, setCadence] = useState<Cadence>("monthly");
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
      {/* TODO PRICE-02: annual vs monthly maps to distinct Stripe prices ($590/yr, $59/mo). */}
      <ButtonLink href="/signup" variant="primary" className="mt-6 w-full">
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

      <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
        {audience === "couples" ? (
          COUPLE_PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))
        ) : (
          <>
            <PlannerCard />
            <PlanCard plan={AGENCY_PLAN} />
          </>
        )}
      </div>

      <p className="mx-auto mt-10 max-w-xl text-center text-[13px] font-medium text-muted">
        {FOOTER[audience]}
      </p>
    </div>
  );
}
