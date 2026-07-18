import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const audiences = [
  {
    eyebrow: "For couples",
    title: "One calm place for the whole plan",
    body: "Track tasks, money, vendors, and guests without juggling five apps and a shared spreadsheet.",
    href: "/signup",
    cta: "Plan your wedding",
  },
  {
    eyebrow: "For planners",
    title: "Every client wedding at a glance",
    body: "See what's overdue, who needs a reply, and which budgets are drifting — then jump straight into the right tab.",
    href: "/signup",
    cta: "Run your studio",
  },
] as const;

export function AudienceSplit() {
  return (
    <section
      id="for-planners"
      className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20"
    >
      <div className="mb-10 max-w-xl">
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
          Built for both sides
        </p>
        <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[36px]">
          Couples plan. Planners run the room.
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {audiences.map((a) => (
          <Card
            key={a.eyebrow}
            variant="emotional"
            className="flex h-full flex-col p-7 md:p-8"
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
              {a.eyebrow}
            </p>
            <h3 className="mt-3 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
              {a.title}
            </h3>
            <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted">
              {a.body}
            </p>
            <div className="mt-6">
              <ButtonLink href={a.href}>{a.cta}</ButtonLink>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
