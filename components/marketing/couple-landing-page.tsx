import { DemoCta } from "@/components/demo/demo-cta";
import {
  AudienceCopyHeader,
  AudienceSection,
  BeforeAfterStrip,
} from "@/components/marketing/audience-landing";
import { CapabilitiesPanel } from "@/components/marketing/capabilities-panel";
import { CoupleHeroPreview } from "@/components/marketing/couple-hero-preview";
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
  COUPLE_LIFETIME_PRICE,
  COUPLE_MONTHLY_PRICE,
  formatCouplePrice,
} from "@/lib/billing/couple-pricing";
import {
  howToJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";
import Link from "next/link";

/**
 * COUPLES-PIVOT homepage ("/"). Drafted from /for-couples, rewritten for
 * search: one H1 on the primary query ("wedding planning app"), H2s on the
 * secondary queries (checklist, budget tracker, guest list & RSVP, seating
 * chart, wedding website), internal links to each guide page, plus
 * Organization / WebSite / SoftwareApplication / HowTo / FAQPage JSON-LD.
 *
 * Copy policy: never lead with "AI" — it's "the assistant".
 */

const MONTHLY = formatCouplePrice(COUPLE_MONTHLY_PRICE);
const LIFETIME = formatCouplePrice(COUPLE_LIFETIME_PRICE);

export const COUPLE_LANDING_DESCRIPTION =
  "First Look is a free wedding planning app: a wedding checklist, budget tracker, guest list with online RSVP, seating chart, and wedding website in one place.";

const CHANGES = [
  {
    label: "The plan",
    before: "A Pinterest board and a shared note",
    after: "A wedding checklist built around your date and budget",
  },
  {
    label: "Guests",
    before: "A spreadsheet and a separate RSVP tool",
    after: "Guest list, RSVPs, meals, and seating in one place",
  },
  {
    label: "The website",
    before: "Another website builder, another login",
    after: "Your wedding website, with RSVP built in",
  },
] as const;

const TOOLS = [
  {
    title: "Wedding planning checklist",
    body: "A month-by-month to-do list that works backward from your wedding date, so you always know what to book next.",
    href: "/wedding-planning-checklist",
    cta: "See the checklist",
  },
  {
    title: "Wedding budget tracker",
    body: "Estimated vs. actual spend for every vendor, a log of what's paid, and the deposits still coming due.",
    href: "/wedding-budget-tracking",
    cta: "See budget tracking",
  },
  {
    title: "Guest list & online RSVP",
    body: "Track households, plus-ones, and kids. Guests RSVP on your wedding website with meal choices and dietary notes.",
    href: "/wedding-guest-list",
    cta: "See the guest list",
  },
  {
    title: "Wedding seating chart",
    body: "Drag guests onto tables, add a sweetheart table and dance floor, and keep the chart in sync with your RSVPs.",
    href: "/wedding-seating-chart",
    cta: "See the seating chart",
  },
] as const;

const STEPS = [
  {
    name: "Tell us about your wedding",
    text: "Add your date, location, guest count, and budget. It takes about two minutes.",
  },
  {
    name: "Get a starter plan",
    text: "First Look builds a wedding checklist and budget around your date, so you start with a plan instead of a blank page.",
  },
  {
    name: "Build your guest list and website",
    text: "Add guests, pick a wedding website template, and share it. RSVPs flow straight back into your guest list.",
  },
  {
    name: "Book vendors and seat your guests",
    text: "Track every vendor from first email to booked, log payments as you go, and finish the seating chart once RSVPs are in.",
  },
] as const;

const FAQS = [
  {
    q: "Is First Look really free?",
    a: `Yes. The checklist, budget tracker, guest list, online RSVP, seating chart, vendor tracking, and wedding website are free, with no card required. The planning assistant is the only paid part: ${MONTHLY} a month, or ${LIFETIME} once for the life of your wedding.`,
  },
  {
    q: "What does the paid plan add?",
    a: "The assistant. Ask it in plain language to add tasks, update your budget, or find what's overdue, and it makes the change for you. It also sends a weekly planning summary, flags things that need attention, and drafts vendor emails for you to approve before anything is sent.",
  },
  {
    q: "Does First Look include a wedding website?",
    a: "Yes. Choose a designer template, add your story, photos, wedding party, travel details, and registry links, then publish. Guests RSVP right on the site, and their answers land in your guest list.",
  },
  {
    q: "Can guests RSVP online?",
    a: "Yes. Each household finds their invitation by name and RSVPs for everyone in their party, including meal choices, dietary notes, and song requests if you turn them on.",
  },
  {
    q: "How do I start planning a wedding?",
    a: "Start with the big three: your date, your budget, and a rough guest count. Those decide your venue, and your venue decides most of what comes after. First Look turns those answers into a checklist and budget, so the next step is always clear.",
  },
  {
    q: "How far in advance should we start planning?",
    a: "Many couples start 12 to 18 months out, because popular venues and photographers book early. If you have less time, that's fine. Your checklist works backward from whatever date you set.",
  },
  {
    q: "Can I use First Look if we already have a wedding planner?",
    a: "Yes. If your planner uses First Look, they can invite you into the same wedding. You work the checklist, guests, and website together.",
  },
  {
    q: "Do I need to download an app?",
    a: "No. First Look runs in your browser on your phone, tablet, or computer, so you and your partner can plan from anywhere.",
  },
] as const;

function ToolsSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-16">
      <ScrollReveal>
        <AudienceCopyHeader
          eyebrow="Free wedding planning tools"
          title="Everything you'd build a spreadsheet for, already built."
          subhead="Each tool is free, and they all share the same guest list, budget, and date, so you never copy anything twice."
        />
      </ScrollReveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {TOOLS.map((tool, index) => (
          <ScrollReveal key={tool.href} delayMs={index * 50}>
            <article className="marketing-card-hover flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-6 shadow-raised">
              <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                {tool.title}
              </h3>
              <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-muted">
                {tool.body}
              </p>
              <Link
                href={tool.href}
                className="mt-4 text-[14.5px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                {tool.cta} →
              </Link>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

function AssistantSection() {
  const points = [
    {
      title: "Ask in plain language",
      body: "“Move the cake tasting to next week and add a $600 budget line for the cake.” Done.",
    },
    {
      title: "A weekly planning summary",
      body: "One email each week with what's coming up, what's overdue, and what to do next.",
    },
    {
      title: "Vendor emails, drafted",
      body: "It writes the inquiry. You read it, edit it, and send it from your own Gmail.",
    },
  ] as const;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-16">
      <ScrollReveal>
        <div className="rounded-[var(--radius-card)] bg-surface p-7 shadow-raised md:p-10">
          <div className="max-w-[56ch]">
            <Eyebrow className="mb-4 block">The planning assistant</Eyebrow>
            <h2 className="text-[28px] font-extrabold tracking-[-0.03em] text-ink md:text-[36px]">
              Want help doing the work? Add the assistant.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted md:text-[16px]">
              Planning is free. The assistant is the one paid upgrade:{" "}
              {MONTHLY} a month, or {LIFETIME} once. It works inside your
              wedding, so it updates the same checklist, budget, and guest list
              you do.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {points.map((point) => (
              <div
                key={point.title}
                className="rounded-[var(--radius-inner)] bg-well px-5 py-4 shadow-recessed"
              >
                <h3 className="text-[15px] font-semibold text-ink">
                  {point.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">
                  {point.body}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/pricing"
            className="mt-6 inline-block text-[14.5px] font-semibold text-accent underline-offset-2 hover:underline"
          >
            Compare free and paid →
          </Link>
        </div>
      </ScrollReveal>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-16">
      <ScrollReveal>
        <AudienceCopyHeader
          eyebrow="How it works"
          title="How to plan your wedding with First Look"
          subhead="Four steps from “we're engaged” to a seating chart you can hand to the venue."
        />
      </ScrollReveal>
      <ol className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
        {STEPS.map((step, index) => (
          <li key={step.name}>
            <ScrollReveal delayMs={index * 50}>
              <div className="flex h-full gap-4 rounded-[var(--radius-card)] bg-surface p-6 shadow-raised">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-accent-wash text-[14px] font-bold text-accent"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-[16px] font-extrabold tracking-[-0.01em] text-ink">
                    {step.name}
                  </h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">
                    {step.text}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </li>
        ))}
      </ol>
      <JsonLd
        data={howToJsonLd({
          name: "How to plan your wedding with First Look",
          description:
            "Plan a wedding in four steps: set your date and budget, get a starter checklist, build your guest list and wedding website, then book vendors and seat your guests.",
          steps: STEPS,
        })}
      />
    </section>
  );
}

export function CoupleLandingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={websiteJsonLd()} />
      <JsonLd
        data={softwareApplicationJsonLd(COUPLE_LANDING_DESCRIPTION, {
          category: "LifestyleApplication",
          offers: [
            { name: "Free", price: "0" },
            { name: "Assistant monthly", price: COUPLE_MONTHLY_PRICE.toFixed(2) },
            { name: "Assistant lifetime", price: COUPLE_LIFETIME_PRICE.toFixed(2) },
          ],
        })}
      />
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-8 md:px-10 md:pt-[76px]">
          <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
            <ScrollReveal>
              <Eyebrow className="mb-5 block">Free wedding planning app</Eyebrow>
              <h1 className="max-w-[18ch] text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[60px]">
                Plan your whole wedding in one free app.
              </h1>
              <p className="mt-6 max-w-[50ch] text-[16px] leading-relaxed text-muted md:text-[19px]">
                A wedding checklist, budget tracker, guest list with online
                RSVP, seating chart, and wedding website, all connected. Change
                something once and it&apos;s right everywhere.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ButtonLink
                  href="/login"
                  variant="primary"
                  className="px-6 py-3.5 text-[15px] md:px-8 md:py-4 md:text-[16px]"
                >
                  Start planning free
                </ButtonLink>
                <DemoCta kind="personal" compact />
              </div>
              <p className="mt-5 text-[13.5px] font-medium text-muted">
                Free to plan · No card required · Add the assistant for{" "}
                {MONTHLY}/mo or {LIFETIME} once
              </p>
            </ScrollReveal>
            <ScrollReveal delayMs={80}>
              <CoupleHeroPreview />
            </ScrollReveal>
          </div>
        </section>

        <AudienceSection>
          <ScrollReveal>
            <BeforeAfterStrip items={CHANGES} />
          </ScrollReveal>
        </AudienceSection>

        <FeatureGrid
          eyebrow="Wedding planning, connected"
          title="One wedding planner app instead of six tabs."
          subhead="Your checklist, vendors, guests, seating, timeline, and website all read from the same plan."
        />

        <ToolsSection />

        <HowItWorksSection />

        <AssistantSection />

        <CapabilitiesPanel />

        <MarketingFaq items={FAQS} heading="Wedding planning questions" />

        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
