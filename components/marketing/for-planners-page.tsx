import { DemoCta } from "@/components/demo/demo-cta";
import {
  AudienceCopyHeader,
  AudienceSection,
  BeforeAfterStrip,
} from "@/components/marketing/audience-landing";
import { CoupleCollaboration } from "@/components/marketing/couple-collaboration";
import { FinalCta } from "@/components/marketing/final-cta";
import { HeroProductPreview } from "@/components/marketing/hero-product-preview";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { WhiteLabelShowcase } from "@/components/marketing/white-label-showcase";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import Link from "next/link";

const CHANGES = [
  {
    label: "Leads",
    before: "Buried in email threads",
    after: "Automatically staged, stale ones flagged",
  },
  {
    label: "Contracts",
    before: "Word doc, DocuSign, a folder",
    after: "Proposal to signed contract, filed automatically",
  },
  {
    label: "Your clients",
    before: "A spreadsheet you email back and forth",
    after: "Their own branded workspace, synced automatically",
  },
] as const;

export function ForPlannersPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 md:px-10 md:pt-[76px]">
          <ScrollReveal className="mx-auto max-w-[44ch] text-center">
            <Eyebrow className="mb-5 block">For wedding planners</Eyebrow>
            <h1 className="text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[64px]">
              Every client&apos;s wedding — automated, in one book.
            </h1>
            <p className="mt-6 text-[16px] leading-relaxed text-muted md:text-[19px]">
              Leads, contracts, seating, billing, and a branded client
              experience. First Look replaces the spreadsheet-and-five-tools
              stack most planning businesses run on today.
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
                eyebrow="Leads to contracts"
                title="A pipeline that runs itself."
                subhead="Every inquiry moves through your stages automatically. Leads sitting untouched for two weeks get flagged before they go cold, and an accepted proposal becomes a filed, signed contract without leaving the app."
              />
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
          </ScrollReveal>
        </AudienceSection>

        <FinalCta
          eyebrow="Ready when you are"
          title="Run your business on one platform."
          subhead="Free to start. Bring your first client — contracts, seating, billing, and their site run automatically from day one."
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
