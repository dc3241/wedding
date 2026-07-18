const features = [
  {
    title: "Checklist that actually moves",
    body: "Phases, due dates, and a progress band you can read from across the room.",
  },
  {
    title: "Budget without pie charts",
    body: "Committed vs planned as filled bars — same vocabulary as the checklist.",
  },
  {
    title: "Vendors with a paper trail",
    body: "Outreach status, quotes, and follow-ups in one place instead of buried threads.",
  },
  {
    title: "Guests & seating together",
    body: "RSVPs feed the floor plan. Full tables light sage; selection stays berry.",
  },
  {
    title: "Day-of timeline",
    body: "A run sheet that prints clean and stays linked to the tasks that got you there.",
  },
  {
    title: "Website that matches the day",
    body: "Public templates stay romantic. The editor stays Soft stack chrome.",
  },
] as const;

export function FeatureGrid() {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mb-10 max-w-xl">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
          The workspace
        </p>
        <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[36px]">
          Everything you need. Nothing decorative in the way.
        </h2>
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-[var(--radius-card)] bg-surface p-6 shadow-[var(--shadow-raised)]"
          >
            <h3 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink">
              {f.title}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
