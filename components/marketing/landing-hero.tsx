import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DisplayHeading } from "@/components/ui/display-heading";
import { Eyebrow } from "@/components/ui/eyebrow";
import { FeatureRow } from "@/components/ui/feature-row";

const HERO_FEATURES = [
  { label: "Checklist", href: "#features" },
  { label: "Budget", href: "#features" },
  { label: "Vendors", href: "#features" },
  { label: "Guests", href: "#features" },
  { label: "Website", href: "#features" },
] as const;

function ChecklistIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3 9.5l3.5 3.5L15 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingHero() {
  return (
    <section className="mx-auto max-w-[880px] px-6 pb-20 pt-16 text-center md:pt-24">
      <Eyebrow
        diamond
        rules
        className="animate-rise mb-7 w-full justify-center"
      >
        Planning, without the noise
      </Eyebrow>

      <DisplayHeading
        as="h1"
        size="lg"
        className="animate-rise mx-auto max-w-[14ch]"
        style={{ animationDelay: "100ms" }}
      >
        Everything for your wedding, in one <em>calm</em> place.
      </DisplayHeading>

      <p
        className="animate-rise mx-auto mt-6 max-w-[560px] text-base leading-relaxed text-ink-muted md:text-[17px]"
        style={{ animationDelay: "200ms" }}
      >
        Checklist, budget, vendors, guests, and a shareable site — without the
        spreadsheet chaos.
      </p>

      <div className="animate-rise mt-7" style={{ animationDelay: "250ms" }}>
        <FeatureRow items={[...HERO_FEATURES]} />
      </div>

      <div
        className="animate-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        style={{ animationDelay: "300ms" }}
      >
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

      <Card
        variant="emotional"
        icon={<ChecklistIcon />}
        className="animate-rise mx-auto mt-12 max-w-[480px] text-left"
        style={{ animationDelay: "400ms" }}
      >
        <p className="text-[15px] leading-relaxed text-ink">
          Your checklist, budget, and vendor outreach — organized from day one.
        </p>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          No spreadsheets. No scattered threads. Just one calm workspace.
        </p>
      </Card>
    </section>
  );
}
