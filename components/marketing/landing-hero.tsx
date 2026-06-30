import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

export function LandingHero() {
  return (
    <section className="mx-auto max-w-[760px] px-6 pb-16 pt-14 text-center md:pt-20">
      <Eyebrow className="mb-4 block">Planning, without the noise</Eyebrow>
      <h1 className="font-display text-[clamp(44px,7vw,64px)] leading-[1.02] tracking-[-0.01em] text-ink">
        Everything for your wedding, in one calm place.
      </h1>
      <p className="mx-auto mt-5 max-w-[560px] text-base leading-relaxed text-ink-muted md:text-[17px]">
        Checklist, budget, vendors, guests, and a shareable site — without the
        spreadsheet chaos.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <ButtonLink href="/login" variant="primary" className="min-w-[180px] text-[15px]">
          Get started free
        </ButtonLink>
        <ButtonLink
          href="#for-planners"
          variant="default"
          className="min-w-[180px] text-[15px]"
        >
          I&apos;m a wedding planner
        </ButtonLink>
      </div>
    </section>
  );
}
