import { MarketingFaq } from "@/components/marketing/marketing-faq";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  COUPLE_LIFETIME_PRICE,
  COUPLE_MONTHLY_PRICE,
  formatCouplePrice,
} from "@/lib/billing/couple-pricing";
import { B2B_MARKETING_ENABLED } from "@/lib/marketing-flags";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

const MONTHLY = formatCouplePrice(COUPLE_MONTHLY_PRICE);
const LIFETIME = formatCouplePrice(COUPLE_LIFETIME_PRICE);

export const metadata: Metadata = B2B_MARKETING_ENABLED
  ? pageMetadata({
      title: "Pricing",
      description:
        "Wedding planning CRM pricing for planners and venues, plus a couple workspace. 7-day free trial, no card to start.",
      path: "/pricing",
    })
  : pageMetadata({
      title: "Wedding Planning App Pricing",
      description: `First Look is free for couples: checklist, budget, guest list, RSVP, seating chart, and wedding website. Add the planning assistant for ${MONTHLY}/month or ${LIFETIME} once.`,
      path: "/pricing",
    });

const COUPLE_FAQS = [
  {
    q: "What's free?",
    a: "All of the planning tools: the wedding checklist and calendar, budget tracker and payment log, guest list with online RSVP, seating chart, vendor search and tracking, day-of timeline, and your wedding website. No card and no trial clock.",
  },
  {
    q: "What does the assistant do?",
    a: "You ask in plain language and it updates your checklist, budget, and guests for you. It also emails a weekly planning summary, flags things that need attention, and drafts vendor emails for you to approve before anything is sent.",
  },
  {
    q: "Monthly or lifetime — which should we pick?",
    a: `Monthly is ${MONTHLY} and you can cancel anytime. Lifetime is ${LIFETIME} once, which works out cheaper if you'll want the assistant for more than about five months of planning.`,
  },
  {
    q: "What happens if we cancel the assistant?",
    a: "You keep everything. Your plan, guests, budget, and website stay exactly where they are, and all the free tools keep working.",
  },
] as const;

const B2B_FAQS = [
  {
    q: "Do I keep paying after the wedding?",
    a: "No. Cancel anytime. The workspace locks until you subscribe again. A site already published at its public address stays up, and nothing is deleted.",
  },
  {
    q: "Can I switch plans later?",
    a: "Anytime, in both directions. Upgrades apply immediately; downgrades take effect at the end of your billing period.",
  },
  {
    q: "How does planner billing work?",
    a: "One flat monthly rate per planner account — not per couple. Invite as many couples as your plan's active-wedding limit allows.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Nothing is deleted. The workspace locks until you subscribe again, and a site already published at its public address stays up.",
  },
] as const;

const FAQS = B2B_MARKETING_ENABLED ? B2B_FAQS : COUPLE_FAQS;

export default function PricingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-14 pb-8 md:px-10 md:pt-20">
          <div className="mx-auto max-w-[60ch] text-center">
            <Eyebrow className="mb-4 block">Pricing</Eyebrow>
            <h1 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
              {B2B_MARKETING_ENABLED
                ? "One workspace. Two sides of the aisle."
                : "Plan your wedding free. Add help when you want it."}
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-muted md:text-[16px]">
              {B2B_MARKETING_ENABLED
                ? "Couples plan free and can add the assistant. Planners run their whole book from one account. No setup fees, cancel anytime."
                : `Every planning tool is free. The assistant is the one upgrade: ${MONTHLY} a month, or ${LIFETIME} once.`}
            </p>
          </div>

          <div className="mt-12">
            <PricingPlans />
          </div>
        </section>

        <MarketingFaq items={FAQS} />

        <section className="mx-auto max-w-6xl px-6 pb-16 md:px-10 md:pb-24">
          <div className="rounded-[var(--radius-card)] bg-surface px-8 py-12 text-center shadow-raised md:px-14 md:py-14">
            <h2 className="text-[28px] font-extrabold tracking-[-0.03em] text-ink md:text-[32px]">
              Start planning in minutes.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
              Free to plan. Add the assistant whenever you like — no card
              required.
            </p>
            <ButtonLink
              href="/login"
              variant="primary"
              className="mt-7 px-7 py-3.5 text-[15px]"
            >
              Get started
            </ButtonLink>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
