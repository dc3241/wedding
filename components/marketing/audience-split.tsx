import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";
import { SectionHeader } from "@/components/ui/section-header";

const COUPLE_ITEMS = [
  "AI-generated checklist and budget from your vibe",
  "Vendor search, outreach, and quote tracking",
  "Guest list, RSVP, seating, and wedding website",
];

const PLANNER_ITEMS = [
  "Multi-wedding dashboard with urgent items at a glance",
  "Leads CRM, proposals, and client contracts",
  "Gmail outreach — same tools your couples use per wedding",
];

function AudienceCard({
  eyebrow,
  title,
  description,
  items,
  ctaHref,
  ctaLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: string[];
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <Card className="marketing-card-hover flex h-full flex-col p-6 md:p-8">
      <Eyebrow className="mb-3 block">{eyebrow}</Eyebrow>
      <h3 className="font-display text-[28px] leading-tight tracking-[-0.01em] text-ink md:text-[32px]">
        {title}
      </h3>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{description}</p>
      <ul className="mt-5 space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2.5 text-[15px] leading-snug text-ink-soft before:mt-2 before:size-1.5 before:shrink-0 before:rounded-full before:bg-plum before:content-['']"
          >
            {item}
          </li>
        ))}
      </ul>
      <ButtonLink href={ctaHref} variant="primary" className="mt-8 w-full text-[15px]">
        {ctaLabel}
      </ButtonLink>
    </Card>
  );
}

export function AudienceSplit() {
  return (
    <section id="for-planners" className="mx-auto max-w-[1180px] px-6 pb-20">
      <RevealOnScroll>
        <SectionHeader>Who it&apos;s for</SectionHeader>
      </RevealOnScroll>
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        <RevealOnScroll delay={80}>
          <AudienceCard
            eyebrow="For couples"
            title="One wedding, full toolkit"
            description="Plan your day from first ideas through guest RSVPs — calm, organized, and all in one place."
            items={COUPLE_ITEMS}
            ctaHref="/login"
            ctaLabel="Start planning"
          />
        </RevealOnScroll>
        <RevealOnScroll delay={160}>
          <AudienceCard
            eyebrow="For planners"
            title="Every client, one dashboard"
            description="Run your business and every wedding on the same platform — no duplicate tools, no messy handoffs."
            items={PLANNER_ITEMS}
            ctaHref="/login"
            ctaLabel="Start as a planner"
          />
        </RevealOnScroll>
      </div>
    </section>
  );
}
