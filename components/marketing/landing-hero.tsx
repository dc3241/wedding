import { ButtonLink } from "@/components/ui/button";
import { ProductPreview } from "@/components/marketing/product-preview";

export function LandingHero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:gap-14 md:px-10 md:py-24">
      <div>
        <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
          Soft stack planning
        </p>
        <h1 className="max-w-[16ch] text-[42px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink md:text-[52px]">
          Wedding planning that stays calm under pressure.
        </h1>
        <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted">
          Checklists, budgets, vendors, guests, and day-of timelines in one
          raised workspace — built for couples and the planners who run their
          weddings.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink href="/signup" className="px-5 py-3 text-[15px]">
            Start free
          </ButtonLink>
          <ButtonLink
            href="/login"
            variant="secondary"
            className="px-5 py-3 text-[15px]"
          >
            Sign in
          </ButtonLink>
        </div>
      </div>
      <ProductPreview />
    </section>
  );
}
