import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionHeader } from "@/components/ui/section-header";

const FEATURES = [
  {
    eyebrow: "Checklist",
    title: "Know what to do next",
    description:
      "Phase-based tasks from 12 months out through the week of — generated from your wedding profile.",
  },
  {
    eyebrow: "Budget",
    title: "See where every dollar goes",
    description:
      "Target, allocated, and remaining at a glance. Vendor quotes roll in automatically when booked.",
  },
  {
    eyebrow: "Vendors",
    title: "Search, contact, and book",
    description:
      "Discover vendors, track outreach stages, and keep quotes beside each category.",
  },
  {
    eyebrow: "Guests",
    title: "RSVP without the inbox mess",
    description:
      "Guest list, meal choices, and RSVP submissions in one view — filter by status instantly.",
  },
  {
    eyebrow: "Website",
    title: "A site guests actually want to visit",
    description:
      "Pick a template, publish your details, and share a link — no separate website builder needed.",
  },
  {
    eyebrow: "Timeline",
    title: "Day-of, minute by minute",
    description:
      "A run sheet distinct from long-range planning — ceremony through last dance, who owns what.",
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-[1180px] px-6 pb-20">
      <SectionHeader>Everything in one place</SectionHeader>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {FEATURES.map((feature) => (
          <Card key={feature.eyebrow} className="p-6">
            <Eyebrow className="mb-2.5 block">{feature.eyebrow}</Eyebrow>
            <h3 className="text-[15px] font-medium text-ink">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {feature.description}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
