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
    before: "A proposal in one tool, an invoice in another",
    after: "Proposal to signed contract to invoice, in one place",
  },
  {
    label: "Your brand",
    before: "Couples land in someone else's app",
    after: "Your logo, your colors, top to bottom",
  },
] as const;

const FAQS = [
  {
    q: "How is the venue CRM different from the planner CRM?",
    a: "It isn't, except for white-label. Venues and planners share the same pipeline: inquiry, proposal, contract, invoice, then the couple's workbook. Venue accounts put your branding on every coordinator's dashboard and every client's site.",
  },
  {
    q: "What does white-label include?",
    a: "Your logo and colors on the couple's workspace and wedding site. Venue accounts can extend that branding across the whole team's dashboard, not just the client view.",
  },
  {
    q: "Can my whole team share one book?",
    a: "Yes. Add anyone on staff — no roles to configure. Everyone sees every wedding on your calendar.",
  },
  {
    q: "Do couples still get a planning workspace?",
    a: "Yes. After they book, invite them into the same wedding: checklist, guests, seating, budget, and a site under your brand.",
  },
  {
    q: "How does venue pricing work?",
    a: "One venue plan for the whole team, billed monthly or annually. 7-day free trial, no card to start.",
  },
] as const;

const APP_DESCRIPTION =
  "First Look is a wedding venue CRM with white-label branding: inquiry to payment to the couple's workbook, under your venue's name.";

export function ForVenuesPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={softwareApplicationJsonLd(APP_DESCRIPTION)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "For venues", path: "/for-venues" },
        ])}
      />
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 md:px-10 md:pt-[76px]">
          <ScrollReveal className="mx-auto max-w-[44ch] text-center">
            <Eyebrow className="mb-5 block">Wedding venue CRM</Eyebrow>
            <h1 className="text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[64px]">
              Same CRM. Your brand on every screen.
            </h1>
            <p className="mt-6 text-[16px] leading-relaxed text-muted md:text-[19px]">
              Lead, payment, workbook — the same pipeline planners use.
              White-label is the difference: every coordinator&apos;s dashboard
              and every client&apos;s site runs in your name.
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
                href="/for-planners"
                className="text-[14px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                Running this independently instead? See what&apos;s different
                for planners →
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
          <WhiteLabelShowcase
            eyebrow="Your brand, everywhere"
            title="Not just your couples' view — your whole team's."
            subhead="Ordinary planner accounts stay First Look for their own team. Venue accounts are different: turn on white-label and your entire workspace — every coordinator's dashboard, every client's site — runs under your name automatically."
          />
        </AudienceSection>

        <AudienceSection>
          <ScrollReveal>
            <AudienceCopyHeader
              eyebrow="Your whole team, one seat type"
              title="Every coordinator, the same full access."
              subhead="Add anyone on staff to your account — no roles to configure, no per-seat guessing. Everyone sees every wedding on your calendar."
            />
          </ScrollReveal>
        </AudienceSection>

        <AudienceSection>
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <ScrollReveal>
              <AudienceCopyHeader
                align="left"
                eyebrow="Lead to payment to workbook"
                title="One book for everything on your calendar."
                subhead="Inquiries, contracts, invoices, and each couple's planning — in the same place, whether they booked six months out or eighteen."
              />
            </ScrollReveal>
            <ScrollReveal delayMs={80}>
              <HeroProductPreview />
            </ScrollReveal>
          </div>
        </AudienceSection>

        <AudienceSection>
          <CoupleCollaboration />
        </AudienceSection>

        <AudienceSection>
          <ScrollReveal>
            <AudienceCopyHeader
              eyebrow="Your preferred vendor list"
              title="The vendors you already work with, in every booking."
              subhead="Save your preferred florists, caterers, and photographers once. Couples booking your venue can book straight from that list — automatically tracked, no separate spreadsheet."
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

        <MarketingFaq items={FAQS} />

        <FinalCta
          eyebrow="Ready when you are"
          title="Bring your team. Keep your brand."
          subhead="Free to start. Contracts, invoices, seating, and your team's workspace run from day one — under your name, not ours."
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
