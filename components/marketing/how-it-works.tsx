import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { Eyebrow } from "@/components/ui/eyebrow";

const steps = [
  {
    n: "01",
    title: "Start a wedding",
    body: "Set the date and runway — land in a plan that fits your months, not a generic template.",
  },
  {
    n: "02",
    title: "Move the plan forward",
    body: "Ask your wedding assistant, book vendors, publish the site. RSVPs and statuses fill in as you go.",
  },
  {
    n: "03",
    title: "Run the day",
    body: "One run sheet from the same plan — nothing stuck in another tool when vendors need answers.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how"
      className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20"
    >
      <ScrollReveal className="mb-11 max-w-[60ch]">
        <Eyebrow className="mb-4 block">How it works</Eyebrow>
        <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
          Three steps from blank to day-of.
        </h2>
      </ScrollReveal>
      <ol className="grid gap-6 md:grid-cols-3">
        {steps.map((step, i) => (
          <ScrollReveal key={step.n} delayMs={i * 60}>
            <li className="marketing-card-hover list-none rounded-[var(--radius-card)] bg-surface p-7 shadow-raised md:p-[30px]">
              <span className="text-[14px] font-extrabold tracking-[0.04em] text-accent">
                {step.n}
              </span>
              <h3 className="mt-4 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
                {step.title}
              </h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-muted">
                {step.body}
              </p>
            </li>
          </ScrollReveal>
        ))}
      </ol>
    </section>
  );
}
