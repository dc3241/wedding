import { Eyebrow } from "@/components/ui/eyebrow";
import { SectionHeader } from "@/components/ui/section-header";

const STEPS = [
  {
    title: "Tell us about your wedding",
    description:
      "Share your date, vibe, traditions, and budget. Aisle builds a personalized checklist and budget to start from.",
  },
  {
    title: "Track everything in one place",
    description:
      "Vendors, tasks, guests, and spending stay connected — no copying between spreadsheets and apps.",
  },
  {
    title: "Share with guests",
    description:
      "Publish your wedding website and collect RSVPs. Your planner sees the same project if you work together.",
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-[760px] px-6 pb-20">
      <SectionHeader>How it works</SectionHeader>
      <ol className="relative space-y-10 pl-7">
        <div
          className="absolute bottom-2 left-[7px] top-2 w-px bg-stone"
          aria-hidden
        />
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative">
            <span
              className="absolute -left-7 top-1.5 flex size-[15px] items-center justify-center rounded-full border border-stone bg-surface"
              aria-hidden
            >
              <span className="size-[7px] rounded-full bg-plum" />
            </span>
            <Eyebrow className="mb-2 block">Step {index + 1}</Eyebrow>
            <h3 className="font-display text-[23px] leading-tight text-ink">
              {step.title}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
