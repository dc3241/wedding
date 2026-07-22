import { HeroProductPreview } from "@/components/marketing/hero-product-preview";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

export function LandingHero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 pb-5 md:px-10 md:pt-[76px]">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <ScrollReveal>
          <Eyebrow className="mb-5 block">Soft stack planning</Eyebrow>
          <h1 className="max-w-[16ch] text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[64px]">
            Wedding planning that stays calm under pressure.
          </h1>
          <p className="mt-6 max-w-[32ch] text-[16px] leading-relaxed text-muted md:text-[19px]">
            Ask your wedding assistant to update the plan, find and email
            vendors, and collect RSVPs on your site — one calm workspace instead
            of five tabs and a shared spreadsheet.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/signup" className="px-5 py-3 text-[15px] md:px-7 md:py-3.5 md:text-[16px]">
              Start free
            </ButtonLink>
            <ButtonLink
              href="/login"
              variant="secondary"
              className="px-5 py-3 text-[15px] md:px-7 md:py-3.5 md:text-[16px]"
            >
              Sign in
            </ButtonLink>
          </div>
        </ScrollReveal>
        <ScrollReveal delayMs={80}>
          <HeroProductPreview />
        </ScrollReveal>
      </div>
    </section>
  );
}
