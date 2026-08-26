import { DemoCta } from "@/components/demo/demo-cta";
import { FinalCta } from "@/components/marketing/final-cta";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingTopbar } from "@/components/marketing/marketing-topbar";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

export function WeddingBudgetTrackingPage() {
  return (
    <div className="min-h-full bg-canvas text-ink">
      <MarketingTopbar />
      <main>
        <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 md:px-10 md:pt-[76px]">
          <ScrollReveal className="mx-auto max-w-[44ch] text-center">
            <Eyebrow className="mb-5 block">Budget tracking</Eyebrow>
            <h1 className="text-[42px] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink md:text-[52px] lg:text-[64px]">
              Your wedding budget, without the surprises
            </h1>
            <p className="mt-6 text-[16px] leading-relaxed text-muted md:text-[19px]">
              Venue quotes never tell the whole story. Service charges, delivery
              fees, gratuities, and alterations all show up later — First Look
              tracks your real total automatically, so nothing catches you off
              guard two months before the wedding.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink
                href="/login"
                variant="primary"
                className="px-6 py-3.5 text-[15px] md:px-8 md:py-4 md:text-[16px]"
              >
                Start free
              </ButtonLink>
              <DemoCta kind="personal" compact />
            </div>
          </ScrollReveal>
        </section>

        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
