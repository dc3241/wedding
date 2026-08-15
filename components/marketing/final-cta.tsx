import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { ButtonLink } from "@/components/ui/button";

type FinalCtaProps = {
  eyebrow?: string;
  title?: string;
  subhead?: string;
};

/** Tier 2: exactly one deep field (`--deep`) per surface — this is it. */
export function FinalCta({
  eyebrow = "Ready when you are",
  title = "Start planning, calmly.",
  subhead = "Free to begin. Bring your date — we'll structure the plan, help you reach vendors, and collect RSVPs while you stay calm.",
}: FinalCtaProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-24">
      <ScrollReveal>
        <div className="rounded-[28px] bg-[var(--deep)] px-8 py-14 text-center shadow-[0_18px_44px_-14px_rgba(61,36,48,0.45)] md:px-14 md:py-16">
          <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--deep-eyebrow)]">
            {eyebrow}
          </p>
          <h2 className="mx-auto mt-4 max-w-[18ch] text-[32px] font-extrabold tracking-[-0.03em] text-white md:text-[40px]">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/70">
            {subhead}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink
              href="/login"
              variant="default"
              className="border-surface bg-surface px-5 py-3 text-[15px] hover:bg-well"
            >
              Create your account
            </ButtonLink>
            <ButtonLink
              href="/login"
              variant="ghost"
              className="border border-white/25 px-5 py-3 text-[15px] text-white hover:bg-white/10"
            >
              Sign in
            </ButtonLink>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
