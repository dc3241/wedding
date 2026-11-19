import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { NewsletterSignup } from "@/components/marketing/newsletter-signup";
import { PartnerSlot } from "@/components/partners/partner-slot";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PLAN_TOOLS } from "@/lib/plan-tools";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * MEDIA-01: shared chrome for a free public planning tool. Tier 1 chrome:
 * raised cards on canvas, one accent CTA, no serif.
 */
export function ToolPage({
  eyebrow,
  title,
  intro,
  source,
  appPitch,
  currentHref,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  /** Newsletter source tag and partner placement, e.g. "tool:alcohol". */
  source: string;
  /** One sentence on how the app continues this tool. */
  appPitch: string;
  currentHref: string;
  children: ReactNode;
}) {
  const others = PLAN_TOOLS.filter((t) => t.kind === "tool" && t.href !== currentHref).slice(0, 3);

  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-4xl px-6 pt-12 pb-6 md:px-10 md:pt-16">
          <Eyebrow className="mb-4 block">
            <Link href="/plan" className="no-underline hover:text-ink">
              Free planning tools
            </Link>{" "}
            · {eyebrow}
          </Eyebrow>
          <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[46px]">
            {title}
          </h1>
          <p className="mt-4 max-w-[60ch] text-[16px] leading-relaxed text-muted md:text-[17px]">
            {intro}
          </p>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-10 md:px-10">{children}</section>

        <section className="mx-auto max-w-4xl px-6 pb-10 md:px-10">
          <div className="rounded-[var(--radius-card)] bg-surface p-6 shadow-raised md:flex md:items-center md:justify-between md:gap-8 md:p-8">
            <div>
              <h2 className="text-[20px] font-extrabold tracking-[-0.02em] text-ink">
                Keep planning in First Look
              </h2>
              <p className="mt-1.5 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">
                {appPitch} Free to plan, no card required.
              </p>
            </div>
            <ButtonLink href="/login" variant="primary" className="mt-4 shrink-0 md:mt-0">
              Start your free plan
            </ButtonLink>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-10 empty:hidden md:px-10">
          <PartnerSlot placement={source} />
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-10 md:px-10">
          <NewsletterSignup source={source} compact />
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-16 md:px-10">
          <h2 className="text-[17px] font-bold text-ink">More free tools</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {others.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="marketing-card-hover block h-full rounded-[var(--radius-card)] bg-surface p-5 no-underline shadow-raised"
                >
                  <span className="block text-[15px] font-bold text-ink">{t.title}</span>
                  <span className="mt-1 block text-[13.5px] leading-relaxed text-muted">
                    {t.body}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
