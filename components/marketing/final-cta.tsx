import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-[1180px] px-6 pb-24">
      <div className="rounded-lg border border-transparent bg-plum-tint px-6 py-14 text-center md:px-12 md:py-16">
        <Eyebrow className="mb-3 block">Get started</Eyebrow>
        <h2 className="font-display text-[clamp(32px,5vw,46px)] leading-[1.02] tracking-[-0.01em] text-plum-deep">
          Start planning with clarity.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-ink-muted">
          Free to start — couples and planners welcome. Set up your first wedding
          in minutes.
        </p>
        <ButtonLink
          href="/login"
          variant="primary"
          className="mt-8 min-w-[200px] text-[15px]"
        >
          Create your account
        </ButtonLink>
      </div>
    </section>
  );
}
