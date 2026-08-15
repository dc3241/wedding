import { DemoCta } from "@/components/demo/demo-cta";
import { HeroProductPreview } from "@/components/marketing/hero-product-preview";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

export function LandingHero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 pb-5 md:px-10 md:pt-[76px]">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <ScrollReveal>
          <Eyebrow className="mb-5 block">Built for planners & venues</Eyebrow>
          <h1 className="max-w-[18ch] text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[64px]">
            Run your planning business — automated.
          </h1>
          <p className="mt-6 max-w-[42ch] text-[16px] leading-relaxed text-muted md:text-[19px]">
            CRM, contracts, seating, and billing — with the busywork handled
            automatically, so you can focus on the wedding, not the admin.
          </p>
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
        </ScrollReveal>
        <ScrollReveal delayMs={80}>
          <HeroProductPreview />
        </ScrollReveal>
      </div>
    </section>
  );
}
