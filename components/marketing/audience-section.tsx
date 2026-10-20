import { DemoCta } from "@/components/demo/demo-cta";
import { CoupleCollaboration } from "@/components/marketing/couple-collaboration";
import {
  FeatureCardGrid,
  type FeatureCard,
} from "@/components/marketing/feature-card-grid";
import {
  CoupleBudgetPreview,
  CoupleChecklistPreview,
  CoupleGuestsPreview,
  CoupleSitePreview,
  PipelinePreview,
  StalePreview,
  TeamPreview,
  WeddingsPreview,
} from "@/components/marketing/planner-feature-previews";
import { WhiteLabelShowcase } from "@/components/marketing/white-label-showcase";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import Link from "next/link";
import type { ReactNode } from "react";

const COUPLES_CARDS = [
  {
    title: "A plan ready on day one",
    body: "Answer a few questions and get a full checklist, budget, and vendor shortlist built around your date and budget — automatically, and yours to edit.",
    icon: PlanIcon,
    Preview: CoupleChecklistPreview,
  },
  {
    title: "Guests, RSVPs, and meals",
    body: "Collect RSVPs with meal choices, track your real headcount, and keep your gift registry in the same place your guests already are.",
    icon: GuestsIcon,
    Preview: CoupleGuestsPreview,
  },
  {
    title: "Your own wedding website",
    body: "A photo-led site with your story, wedding party, travel details, and RSVP built in — no separate website builder to learn.",
    icon: WebsiteIcon,
    Preview: CoupleSitePreview,
  },
  {
    title: "Budget, vendors, and seating together",
    body: "See where the money goes, track vendor outreach and bookings, and build your seating chart — side by side, not scattered across spreadsheets.",
    icon: BudgetIcon,
    Preview: CoupleBudgetPreview,
  },
] satisfies FeatureCard[];

const PLANNERS_CARDS = [
  {
    title: "All your weddings in one book",
    body: "Every client gets their own project. Switch between weddings without losing your place or mixing up details.",
    icon: BookIcon,
    Preview: WeddingsPreview,
  },
  {
    title: "Inquiries land on a board",
    body: "Share a public inquiry page, or embed the form on your site. Every submission becomes a lead — inquiry, contacted, proposal, booked — instead of another email thread. A reply is drafted for you to approve.",
    icon: ContractIcon,
    Preview: PipelinePreview,
  },
  {
    title: "Bring the couple and your team in",
    body: "Invite each couple into their own wedding, and add associates as collaborators on just the weddings they're helping with.",
    icon: TeamIcon,
    Preview: TeamPreview,
  },
  {
    title: "Contract signed. Invoice paid.",
    body: "Leads untouched for two weeks get flagged automatically. An accepted proposal becomes a signed contract and an invoice — without leaving the app.",
    icon: StaleIcon,
    Preview: StalePreview,
  },
] satisfies FeatureCard[];

export function AudienceSection() {
  return (
    <>
      <section
        id="planners"
        className="relative mx-auto max-w-6xl scroll-mt-24 px-6 py-14 md:px-10 md:py-16"
      >
        <span
          id="venues"
          className="pointer-events-none absolute top-0 left-0 h-px w-px scroll-mt-24"
          aria-hidden
        />
        <div className="mx-auto mb-9 max-w-[52ch] text-center">
          <Eyebrow className="mb-4 block">For planners &amp; venues</Eyebrow>
          <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
            The wedding planning CRM that doesn&apos;t stop at the contract.
          </h2>
          <p className="mt-3 text-center text-[15px] leading-relaxed text-muted md:text-[16px]">
            Capture the lead, work the pipeline, collect payment, then invite
            the couple into their own wedding — one book for the whole job.
          </p>
          <DemoCta kind="business" />
        </div>

        <FeatureCardGrid cards={PLANNERS_CARDS} />
        <VenueCallout />

        <div className="mt-9 flex flex-col items-center text-center">
          <ButtonLink
            href="/for-planners"
            variant="primary"
            className="px-6 py-3.5 text-[15px]"
          >
            See planner CRM
          </ButtonLink>
          <p className="mt-3 text-[13px] text-muted">
            Built for solo planners and full agencies alike.{" "}
            <Link
              href="/for-venues"
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              Running a venue? →
            </Link>
          </p>
        </div>

        <WhiteLabelShowcase className="mt-14 md:mt-16" />
        <CoupleCollaboration className="mt-14 md:mt-16" />
      </section>

      <section
        id="couples"
        className="mx-auto max-w-6xl scroll-mt-24 px-6 py-14 md:px-10 md:py-16"
      >
        <div className="mx-auto mb-9 max-w-[52ch] text-center">
          <Eyebrow className="mb-4 block">For couples</Eyebrow>
          <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
            Planning your own wedding?
          </h2>
          <p className="mt-3 text-center text-[15px] leading-relaxed text-muted md:text-[16px]">
            From the day you sign up to the day you say &ldquo;I do&rdquo; —
            checklist, budget, guests, and a site, without juggling five tools.
          </p>
          <DemoCta kind="personal" />
        </div>

        <FeatureCardGrid cards={COUPLES_CARDS} />

        <div className="mt-9 flex flex-col items-center text-center">
          <ButtonLink
            href="/for-couples"
            variant="primary"
            className="px-6 py-3.5 text-[15px]"
          >
            See the couple workspace
          </ButtonLink>
          <p className="mt-3 text-[13px] text-muted">
            No card required. Upgrade any time.
          </p>
        </div>
      </section>
    </>
  );
}

function UnifyChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-ring bg-accent-wash px-4 py-2.5 text-center text-[13px] font-semibold text-ink md:text-[14px]">
      {children}
    </span>
  );
}

function VenueCallout() {
  return (
    <aside className="mt-5 rounded-[var(--radius-card)] border border-ring bg-surface px-5 py-5 shadow-raised md:px-6 md:py-5">
      <Eyebrow className="mb-2 block">For venues</Eyebrow>
      <h3 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink md:text-[19px]">
        Same CRM. Your brand on every screen.
      </h3>
      <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted md:text-[15px]">
        Venues and planners share the same pipeline — inquiry to payment to
        workbook. The difference is white-label: a seat for everyone on staff,
        and your venue&apos;s branding on every screen.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <UnifyChip>Team seats</UnifyChip>
        <UnifyChip>Your branding</UnifyChip>
        <UnifyChip>Dedicated support</UnifyChip>
      </div>
      <p className="mt-4">
        <Link
          href="/for-venues"
          className="text-[14px] font-semibold text-accent underline-offset-2 hover:underline"
        >
          See venue CRM →
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
