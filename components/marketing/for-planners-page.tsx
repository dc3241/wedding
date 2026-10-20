import { DemoCta } from "@/components/demo/demo-cta";
import {
  AudienceCopyHeader,
  AudienceSection,
  BeforeAfterStrip,
} from "@/components/marketing/audience-landing";
import { CoupleCollaboration } from "@/components/marketing/couple-collaboration";
import { FinalCta } from "@/components/marketing/final-cta";
import { HeroProductPreview } from "@/components/marketing/hero-product-preview";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingFaq } from "@/components/marketing/marketing-faq";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { WhiteLabelShowcase } from "@/components/marketing/white-label-showcase";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
} from "@/lib/seo";
import Link from "next/link";

const CHANGES = [
  {
    label: "Leads",
    before: "Buried in email threads",
    after: "Automatically staged, stale ones flagged",
  },
  {
    label: "Payment",
    before: "Word doc, DocuSign, a separate invoice tool",
    after: "Proposal to signed contract to invoice, in one place",
  },
  {
    label: "The wedding",
    before: "A spreadsheet you email back and forth",
    after: "The couple's workbook, inside your book",
  },
] as const;

const FAQS = [
  {
    q: "What is a wedding planning CRM?",
    a: "A CRM for wedding planners tracks inquiries through booked work — pipeline, proposals, contracts, and invoices. First Look continues past that into the wedding itself: checklist, guests, seating, budget, and a site, in the same platform.",
  },
  {
    q: "How is First Look different from HoneyBook or Dubsado?",
    a: "Those tools are strong at client flow: leads, contracts, and getting paid. They stop at your desk. First Look is a wedding planning CRM that also runs the couple's workbook, so you do not hand them five other apps after they book.",
  },
  {
    q: "Do my clients get their own login?",
    a: "Yes. Invite each couple into their own wedding. They see the plan, guests, budget, and site; you keep the pipeline, contracts, and invoices.",
  },
  {
    q: "Can I white-label the workspace?",
    a: "Planner accounts can brand what clients see. Venue accounts can extend that branding across the whole team's dashboard. See venue CRM if you need that.",
  },
  {
    q: "How does planner billing work?",
    a: "One flat monthly or annual rate per planner account — not per couple. Invite as many couples as your plan's active-wedding limit allows. 7-day free trial, no card to start.",
  },
] as const;

const APP_DESCRIPTION =
  "First Look is a wedding planner CRM that goes from lead to payment to the couple's workbook in one platform.";

function demoErrorMessage(code: string | undefined) {
  if (code === "throttled") return "Please wait a moment and try again.";
  if (code === "unavailable") {
    return "Demo isn't available right now. Check back soon — or sign up to start for real.";
  }
  if (code === "1") return "Something went wrong. Try again.";
  return null;
}

export function ForPlannersPage({ demoError }: { demoError?: string }) {
  const demoMessage = demoErrorMessage(demoError);
  return (
    <div className="min-h-full bg-canvas text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={softwareApplicationJsonLd(APP_DESCRIPTION)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "For planners", path: "/for-planners" },
        ])}
      />
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 md:px-10 md:pt-[76px]">
          <ScrollReveal className="mx-auto max-w-[44ch] text-center">
            <Eyebrow className="mb-5 block">Wedding planner CRM</Eyebrow>
            <h1 className="text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[64px]">
              From first inquiry to the wedding itself.
            </h1>
            <p className="mt-6 text-[16px] leading-relaxed text-muted md:text-[19px]">
              Capture leads, send proposals, collect payment, then invite the
              couple into the same wedding. First Look is the CRM that
              doesn&apos;t stop at your desk.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink
                href="/login"
                variant="primary"
                className="px-6 py-3.5 text-[15px] md:px-8 md:py-4 md:text-[16px]"
              >
                Start free
              </ButtonLink>
              <DemoCta kind="business" compact />
            </div>
            {demoMessage ? (
              <p
                role="alert"
                className="mt-4 text-[13px] leading-relaxed text-rosewood"
              >
                {demoMessage}
              </p>
            ) : null}
            <p className="mt-5">
              <Link
                href="/for-venues"
                className="text-[14px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                Running a venue instead? See what&apos;s different →
              </Link>
            </p>
          </ScrollReveal>
        </section>

        <AudienceSection>
          <ScrollReveal>
            <BeforeAfterStrip items={CHANGES} />
          </ScrollReveal>
        </AudienceSection>

        <AudienceSection>
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <ScrollReveal>
              <AudienceCopyHeader
                align="left"
                eyebrow="Lead to payment"
                title="A pipeline that runs itself."
                subhead="Every inquiry moves through your stages automatically. Leads sitting untouched for two weeks get flagged before they go cold, and an accepted proposal becomes a signed contract and an invoice — without leaving the app."
              />
              <p className="mt-4">
                <Link
                  href="/wedding-inquiry-pipeline"
                  className="text-[14px] font-semibold text-accent underline-offset-2 hover:underline"
                >
                  How to run the inquiry pipeline →
                </Link>
              </p>
              <p className="mt-2">
                <Link
                  href="/wedding-planner-contract-template"
                  className="text-[14px] font-semibold text-accent underline-offset-2 hover:underline"
                >
                  Proposal to signed contract →
                </Link>
              </p>
            </ScrollReveal>
            <ScrollReveal delayMs={80}>
              <HeroProductPreview />
            </ScrollReveal>
          </div>
        </AudienceSection>

        <AudienceSection>
          <ScrollReveal>
            <AudienceCopyHeader
              eyebrow="Your whole team"
              title="Bring your associates in — flat, no hierarchy to manage."
              subhead="Invite anyone on your team to the same book. Every member sees every client — no roles to configure, no separate logins to track."
            />
          </ScrollReveal>
        </AudienceSection>

        <AudienceSection>
          <WhiteLabelShowcase
            extra={
              <Link
                href="/for-venues"
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                Running a venue? White-label extends to your entire team&apos;s
                workspace, not just your clients&apos; view.
              </Link>
            }
          />
        </AudienceSection>

        <AudienceSection>
          <CoupleCollaboration />
        </AudienceSection>

        <AudienceSection>
          <ScrollReveal>
            <AudienceCopyHeader
              eyebrow="Your vendor book"
              title="One vendor list, every client project."
              subhead="Save a vendor once and pull them into any wedding. Track outreach, replies, and bookings automatically, with your own notes and portfolio for each."
            />
          </ScrollReveal>
        </AudienceSection>

        <AudienceSection>
          <ScrollReveal>
            <AudienceCopyHeader
              eyebrow="Every wedding at a glance"
              title="See your whole season without opening five tabs."
              subhead="Dashboard cards show each client's countdown, task progress, and confirmed guest count automatically — archive a wedding when it's done, and it's out of your active view for good."
            />
          </ScrollReveal>
        </AudienceSection>

        <AudienceSection>
          <ScrollReveal>
            <AudienceCopyHeader
              eyebrow="Simple pricing"
              title="Start free. Upgrade when you're ready."
              subhead="A 7-day free trial, no card required. Then a monthly or annual plan."
            />
            <p className="mt-6 text-center">
              <Link
                href="/pricing"
                className="text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                View pricing →
              </Link>
            </p>
            <p className="mt-3 text-center">
              <Link
                href="/wedding-planner-crm"
                className="text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                What to look for in a wedding planner CRM →
              </Link>
            </p>
          </ScrollReveal>
        </AudienceSection>

        <MarketingFaq items={FAQS} />

        <FinalCta
          eyebrow="Ready when you are"
          title="Run your business on one platform."
          subhead="Free to start. Bring your first client — contracts, invoices, seating, and their site run from day one."
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
