"use client";

import { DemoCta } from "@/components/demo/demo-cta";
import { CoupleCollaboration } from "@/components/marketing/couple-collaboration";
import { WhiteLabelShowcase } from "@/components/marketing/white-label-showcase";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type Audience = "couples" | "planners";

const COUPLES_CARDS = [
  {
    title: "A plan ready on day one",
    body: "Answer a few questions and get a full checklist, budget, and vendor shortlist built around your date and budget — automatically, and yours to edit.",
    icon: PlanIcon,
  },
  {
    title: "Guests, RSVPs, and meals",
    body: "Collect RSVPs with meal choices, track your real headcount, and keep your gift registry in the same place your guests already are.",
    icon: GuestsIcon,
  },
  {
    title: "Your own wedding website",
    body: "A photo-led site with your story, wedding party, travel details, and RSVP built in — no separate website builder to learn.",
    icon: WebsiteIcon,
  },
  {
    title: "Budget, vendors, and seating together",
    body: "See where the money goes, track vendor outreach and bookings, and build your seating chart — side by side, not scattered across spreadsheets.",
    icon: BudgetIcon,
  },
] as const;

const PLANNERS_CARDS = [
  {
    title: "All your weddings in one book",
    body: "Every client gets their own project. Switch between weddings without losing your place or mixing up details.",
    icon: BookIcon,
  },
  {
    title: "Leads to signed contracts",
    body: "Move prospects through your pipeline, send proposals, and turn an accepted proposal into a printable contract — without leaving the app.",
    icon: ContractIcon,
  },
  {
    title: "Bring the couple and your team in",
    body: "Invite each couple into their own wedding, and add associates as collaborators on just the weddings they're helping with.",
    icon: TeamIcon,
  },
  {
    title: "Nothing goes stale",
    body: "Leads sitting untouched for two weeks get flagged automatically, so nobody falls through.",
    icon: StaleIcon,
  },
] as const;

function hashToAudience(hash: string): Audience | null {
  // Normalize "#couples#couples" → "couples" if a prior nav ever doubled the fragment.
  const id = hash.replace(/^#/, "").split("#")[0];
  if (id === "planners" || id === "venues") return "planners";
  if (id === "couples") return "couples";
  return null;
}

/** Set a clean single-hash URL. Never append to an existing fragment. */
function setAudienceHash(next: Audience) {
  const id = next === "planners" ? "planners" : "couples";
  const nextHash = `#${id}`;
  if (window.location.hash === nextHash) return;
  const url = `${window.location.pathname}${window.location.search}${nextHash}`;
  window.history.replaceState(null, "", url);
}

export function AudienceSection() {
  const [audience, setAudience] = useState<Audience>("planners");

  useEffect(() => {
    function syncFromHash() {
      const next = hashToAudience(window.location.hash);
      if (next) setAudience(next);
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function selectAudience(next: Audience) {
    setAudience(next);
    setAudienceHash(next);
  }

  const isCouples = audience === "couples";
  const cards = isCouples ? COUPLES_CARDS : PLANNERS_CARDS;

  return (
    <section
      id="audience"
      className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-14 md:px-10 md:py-16"
    >
      {/* Scroll targets for topbar hashes — 1px so the browser will scroll */}
      <span
        id="couples"
        className="pointer-events-none absolute top-0 left-0 h-px w-px scroll-mt-24"
        aria-hidden
      />
      <span
        id="planners"
        className="pointer-events-none absolute top-0 left-0 h-px w-px scroll-mt-24"
        aria-hidden
      />
      <span
        id="venues"
        className="pointer-events-none absolute top-0 left-0 h-px w-px scroll-mt-24"
        aria-hidden
      />

      <div className="mb-10 flex flex-col items-center text-center">
        <div
          role="tablist"
          aria-label="Audience"
          className="relative inline-grid grid-cols-2 rounded-[var(--radius-pill)] bg-surface p-1 shadow-raised"
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-[var(--radius-pill)] bg-well shadow-recessed",
              "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
              "motion-reduce:transition-none",
              isCouples ? "translate-x-0" : "translate-x-full",
            )}
          />
          <button
            type="button"
            role="tab"
            id="audience-tab-couples"
            aria-selected={isCouples}
            aria-controls="audience-panel"
            tabIndex={isCouples ? 0 : -1}
            onClick={() => selectAudience("couples")}
            className={cn(
              "relative z-10 cursor-pointer rounded-[var(--radius-pill)] px-5 py-2.5 text-[14px] font-semibold transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              isCouples ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            For couples
          </button>
          <button
            type="button"
            role="tab"
            id="audience-tab-planners"
            aria-selected={!isCouples}
            aria-controls="audience-panel"
            tabIndex={!isCouples ? 0 : -1}
            onClick={() => selectAudience("planners")}
            className={cn(
              "relative z-10 cursor-pointer rounded-[var(--radius-pill)] px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 sm:px-5 sm:text-[14px]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              !isCouples ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            For planners & venues
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        id="audience-panel"
        aria-labelledby={
          isCouples ? "audience-tab-couples" : "audience-tab-planners"
        }
      >
        <div className="mx-auto mb-9 max-w-[52ch] text-center">
          <Eyebrow className="mb-4 block">
            {isCouples ? "For couples" : "For planners & venues"}
          </Eyebrow>
          <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
            {isCouples
              ? "Everything for your wedding, in one place."
              : "Every client wedding, one workspace."}
          </h2>
          <p className="mt-3 text-center text-[15px] leading-relaxed text-muted md:text-[16px]">
            {isCouples
              ? 'From the day you sign up to the day you say "I do" — no juggling five different tools.'
              : "Run your whole book without switching tools — or losing track of which client is where."}
          </p>
          <DemoCta kind={isCouples ? "personal" : "business"} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className="marketing-card-hover rounded-[var(--radius-card)] border border-ring bg-surface p-6 shadow-raised md:p-7"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-[var(--radius-inner)] bg-accent-wash text-accent">
                  <Icon />
                </div>
                <h3 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink md:text-[19px]">
                  {card.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted md:text-[15px]">
                  {card.body}
                </p>
              </article>
            );
          })}
        </div>

        {!isCouples ? <VenueCallout /> : null}

        <div className="mt-9 flex flex-col items-center text-center">
          <ButtonLink
            href="/login"
            variant="primary"
            className="px-6 py-3.5 text-[15px]"
          >
            {isCouples ? "Start planning — free" : "Get started"}
          </ButtonLink>
          <p className="mt-3 text-[13px] text-muted">
            {isCouples
              ? "No card required. Upgrade any time."
              : "Built for solo planners and full agencies alike."}
          </p>
        </div>
      </div>

      <WhiteLabelShowcase className="mt-14 md:mt-16" />

      <CoupleCollaboration className="mt-14 md:mt-16" />
    </section>
  );
}

function UnifyChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-ring bg-accent-wash px-4 py-2.5 text-center text-[13px] font-semibold text-ink md:text-[14px]">
      {children}
    </span>
  );
}

/** VENUE-03c: subordinate callout inside the planners tab — not a 5th feature card. */
function VenueCallout() {
  return (
    <aside className="mt-5 rounded-[var(--radius-card)] border border-ring bg-surface px-5 py-5 shadow-raised md:px-6 md:py-5">
      <Eyebrow className="mb-2 block">For venues</Eyebrow>
      <h3 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink md:text-[19px]">
        Running a venue with your own planning team?
      </h3>
      <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted md:text-[15px]">
        One login for every planner on staff, your venue&apos;s branding on every
        screen, and the full toolset — checklist to seating chart.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <UnifyChip>Team seats</UnifyChip>
        <UnifyChip>Your branding</UnifyChip>
        <UnifyChip>Dedicated support</UnifyChip>
      </div>
      <p className="mt-4">
        <Link
          href="/pricing"
          className="text-[14px] font-semibold text-accent underline-offset-2 hover:underline"
        >
          See Venue pricing →
        </Link>
      </p>
    </aside>
  );
}

function PlanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M5 3.5h10v13H5zM8 6.5h4M8 10h4M8 13.5h2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GuestsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="13.5" cy="7.5" r="1.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.5 15.5c.5-2.2 2-3.5 3.5-3.5s3 1.3 3.5 3.5M11 12.5c1.2 0 2.4.8 3 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WebsiteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="4"
        width="13"
        height="12"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3.5 7.5h13M7 4v3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 15.5V8.5l4-3 4 5 4-3v8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 15.5h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4.5 4.5h9.5a1.5 1.5 0 0 1 1.5 1.5v9.5H6A1.5 1.5 0 0 0 4.5 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 4.5A1.5 1.5 0 0 0 3 6v11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ContractIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M6 3.5h6.5L15.5 7v9.5H6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12.5 3.5V7h3.5M8 10.5h4.5M8 13.5h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.5" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 15.5c.4-2 1.8-3.2 3.5-3.2s3.1 1.2 3.5 3.2M3.5 14.5c.3-1.3 1.1-2.1 2-2.1M16.5 14.5c-.3-1.3-1.1-2.1-2-2.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StaleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 6.5V10l2.5 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
