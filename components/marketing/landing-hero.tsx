import { DemoCta } from "@/components/demo/demo-cta";
import { HeroProductPreview } from "@/components/marketing/hero-product-preview";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import Link from "next/link";

const JOURNEY = ["Lead", "Proposal", "Contract", "Payment", "Workbook"] as const;

export function LandingHero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 pb-5 md:px-10 md:pt-[76px]">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <ScrollReveal>
          <Eyebrow className="mb-5 block">Wedding planning CRM</Eyebrow>
          <h1 className="max-w-[22ch] text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[64px]">
            From first inquiry to the wedding itself.
          </h1>
          <p className="mt-6 max-w-[48ch] text-[16px] leading-relaxed text-muted md:text-[19px]">
            Planners and venues go from lead, to payment, to the couple&apos;s
            workbook in one platform. No other tool runs the whole book.
          </p>
          <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold text-ink">
            {JOURNEY.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                {index > 0 ? (
                  <span className="text-muted" aria-hidden>
                    →
                  </span>
                ) : null}
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink
              href="/login"
              variant="primary"
              className="px-6 py-3.5 text-[15px] md:px-8 md:py-4 md:text-[16px]"
            >
              Start free
            </ButtonLink>
            <DemoCta kind="business" compact />
          </div>
          <p className="mt-5 text-[14px] text-muted">
            Planning your own wedding?{" "}
            <Link
              href="/for-couples"
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              See the couple workspace →
            </Link>
          </p>
        </ScrollReveal>
        <ScrollReveal delayMs={80}>
          <HeroProductPreview />
        </ScrollReveal>
      </div>
    </section>
  );
}
