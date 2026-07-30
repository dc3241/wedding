import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Couples plan free and upgrade when the big stuff kicks in. Planners run their whole book from one account.",
};

const FAQS = [
  {
    q: "Do I keep paying after the wedding?",
    a: "No. Couples cancel anytime — most keep the Couple plan through the honeymoon, then switch back to Free. Your site and plan stay viewable.",
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
    a: "Nothing disappears. Your account drops to read-only on the free feature set — you keep access to your plan, guest list, and website.",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-14 pb-8 md:px-10 md:pt-20">
          <div className="mx-auto max-w-[60ch] text-center">
            <Eyebrow className="mb-4 block">Pricing</Eyebrow>
            <h1 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
              One workspace. Two sides of the aisle.
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-muted md:text-[16px]">
              Couples plan free and upgrade when the big stuff kicks in.
              Planners run their whole book from one account. No setup fees,
              cancel anytime.
            </p>
          </div>

          <div className="mt-12">
            <PricingPlans />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6 py-14 md:px-10 md:py-20">
          <h2 className="text-center text-[22px] font-extrabold tracking-[-0.02em] text-ink md:text-[24px]">
            Questions
          </h2>
          <dl className="mt-8 space-y-6">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-[var(--radius-inner)] bg-well px-5 py-4 shadow-recessed"
              >
                <dt className="text-[15px] font-semibold text-ink">{faq.q}</dt>
                <dd className="mt-2 text-[14.5px] leading-relaxed text-muted">
                  {faq.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16 md:px-10 md:pb-24">
          <div className="rounded-[var(--radius-card)] bg-surface px-8 py-12 text-center shadow-raised md:px-14 md:py-14">
            <h2 className="text-[28px] font-extrabold tracking-[-0.03em] text-ink md:text-[32px]">
              Start planning in minutes.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted">
              Free to begin. Upgrade when you&apos;re ready — no card required.
            </p>
            <ButtonLink
              href="/signup"
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
