const steps = [
  {
    n: "01",
    title: "Start a wedding",
    body: "Name the couple, set the date, and land in a workspace already structured by phase.",
  },
  {
    n: "02",
    title: "Fill the stack",
    body: "Checklist, budget, vendors, and guests share one depth language — raised cards, recessed rows.",
  },
  {
    n: "03",
    title: "Run the day",
    body: "Timeline and run sheet pull from the same plan, so nothing gets lost between tools.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
      <div className="mb-10 max-w-xl">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
          How it works
        </p>
        <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[36px]">
          Three steps from blank to day-of.
        </h2>
      </div>
      <ol className="grid gap-3.5 md:grid-cols-3">
        {steps.map((step) => (
          <li
            key={step.n}
            className="rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-raised)]"
          >
            <span className="text-[13px] font-semibold tabular-nums text-accent">
              {step.n}
            </span>
            <h3 className="mt-3 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
              {step.title}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
