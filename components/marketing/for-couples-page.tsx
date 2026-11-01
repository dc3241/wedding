import { DemoCta } from "@/components/demo/demo-cta";
import {
  AudienceCopyHeader,
  AudienceSection,
  BeforeAfterStrip,
} from "@/components/marketing/audience-landing";
import { FeatureGrid } from "@/components/marketing/feature-grid";
import { FinalCta } from "@/components/marketing/final-cta";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingFaq } from "@/components/marketing/marketing-faq";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
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
    label: "The plan",
    before: "A Pinterest board and a shared note",
    after: "A checklist built around your date and budget",
  },
  {
    label: "Guests",
    before: "A spreadsheet and a separate RSVP tool",
    after: "List, RSVPs, meals, and seating in one place",
  },
  {
    label: "The site",
    before: "Another builder, another login",
    after: "Your wedding website, with RSVP built in",
  },
] as const;

const FAQS = [
  {
    q: "Is First Look free for couples?",
    a: "Yes. Every planning tool is free, with no card required. Add the planning assistant whenever you want help doing the work.",
  },
  {
    q: "What if I already have a wedding planner?",
    a: "They can invite you into the same wedding they already run. You get the checklist, guests, and site; they keep the pipeline, contracts, and invoices.",
  },
  {
    q: "Does it include a wedding website?",
    a: "Yes. Photo-led templates with your story, wedding party, travel details, registry, and RSVP — no separate website builder.",
  },
  {
    q: "Can I track budget and vendors?",
    a: "Yes. Planned vs. actual spend, vendor quotes, outreach, and bookings live next to the guest list and seating chart.",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. Create an account and start planning. Upgrade any time.",
  },
] as const;

const APP_DESCRIPTION =
  "First Look is a wedding planning app for couples: checklist, budget, guests, seating, and a wedding website in one workspace.";

export function ForCouplesPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={softwareApplicationJsonLd(APP_DESCRIPTION)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "For couples", path: "/for-couples" },
        ])}
      />
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 md:px-10 md:pt-[76px]">
          <ScrollReveal className="mx-auto max-w-[44ch] text-center">
            <Eyebrow className="mb-5 block">Wedding planning app</Eyebrow>
            <h1 className="text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[64px]">
              Your wedding, planned — not pieced together.
            </h1>
            <p className="mt-6 text-[16px] leading-relaxed text-muted md:text-[19px]">
              Checklist, budget, guests, seating, and a wedding website in one
              workspace. Free to start. If you have a planner, they can invite
              you in.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink
                href="/login"
                variant="primary"
                className="px-6 py-3.5 text-[15px] md:px-8 md:py-4 md:text-[16px]"
              >
                Start planning — free
              </ButtonLink>
              <DemoCta kind="personal" compact />
            </div>
            <p className="mt-5">
              <Link
                href="/for-planners"
                className="text-[14px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                Are you a planner or venue? See the CRM →
              </Link>
            </p>
          </ScrollReveal>
        </section>

        <AudienceSection>
          <ScrollReveal>
            <BeforeAfterStrip items={CHANGES} />
          </ScrollReveal>
        </AudienceSection>

        <FeatureGrid />

        <AudienceSection>
          <ScrollReveal>
            <AudienceCopyHeader
              eyebrow="Budget tracking"
              title="See the real total, not just the quote."
              subhead="Venue quotes never tell the whole story. Service charges, delivery fees, and gratuities land later — First Look tracks planned vs. actual so nothing surprises you two months out."
            />
            <p className="mt-6 flex flex-col items-center gap-2 text-center">
              <Link
                href="/wedding-planning-checklist"
                className="text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                Wedding planning checklist →
              </Link>
              <Link
                href="/wedding-guest-list"
                className="text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                Guest list and RSVPs →
              </Link>
              <Link
                href="/wedding-seating-chart"
                className="text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                Seating chart →
              </Link>
              <Link
                href="/wedding-budget-tracking"
                className="text-[15px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                How budget tracking works →
              </Link>
            </p>
          </ScrollReveal>
        </AudienceSection>

        <MarketingFaq items={FAQS} />

        <FinalCta
          eyebrow="Ready when you are"
          title="Start planning in minutes."
          subhead="Free to begin. Upgrade when you're ready — no card required."
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
