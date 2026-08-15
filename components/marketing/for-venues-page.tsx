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
    label: "Booking calendar",
    before: "A shared calendar and a lot of hope",
    after: "Every wedding, every coordinator, one book",
  },
  {
    label: "Your brand",
    before: "Prospective couples land in someone else's app",
    after: "Your logo, your colors, top to bottom",
  },
  {
    label: "Your team",
    before: "Separate logins, no shared visibility",
    after: "Flat team seats, everyone sees everything",
  },
] as const;

export function ForVenuesPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 md:px-10 md:pt-[76px]">
          <ScrollReveal className="mx-auto max-w-[44ch] text-center">
            <Eyebrow className="mb-5 block">For venues</Eyebrow>
            <h1 className="text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[64px]">
              Run every wedding on your calendar — under your own brand.
            </h1>
            <p className="mt-6 text-[16px] leading-relaxed text-muted md:text-[19px]">
              CRM, team seats, and a fully white-labeled workspace —
              automated, so your team spends less time on admin and more time
              walking couples through your space.
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
                eyebrow="Every wedding at your venue"
                title="One book for everything on your calendar."
                subhead="Inquiries, contracts, and each couple's planning — automated in the same place, whether they booked six months out or eighteen."
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

        <FinalCta
          eyebrow="Ready when you are"
          title="Bring your team. Keep your brand."
          subhead="Free to start. Contracts, seating, billing, and your team's workspace run automatically from day one — under your name, not ours."
        />
      </main>
      <MarketingFooter />
    </div>
  );
}
