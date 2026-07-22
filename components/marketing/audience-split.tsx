import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";

export function AudienceSplit() {
  return (
    <section
      id="for-planners"
      className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20"
    >
      <ScrollReveal className="mb-11 max-w-[60ch]">
        <Eyebrow className="mb-4 block">Built for both sides</Eyebrow>
        <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
          Couples plan. Planners run the room.
        </h2>
      </ScrollReveal>

      <div className="grid gap-6 md:grid-cols-2">
        <ScrollReveal>
          <article className="marketing-card-hover h-full rounded-[var(--radius-card)] bg-surface p-7 shadow-raised md:p-8">
            <Eyebrow className="block">For couples</Eyebrow>
            <h3 className="mt-3 text-[22px] font-extrabold tracking-[-0.02em] text-ink md:text-[24px]">
              One calm place for the whole plan
            </h3>
            <p className="mt-2.5 mb-5 text-[15px] leading-relaxed text-muted md:text-[16px]">
              Plan less by hand. Ask your wedding assistant to move tasks and
              budgets, reach vendors from your Gmail, and let website RSVPs
              update the guest list for you.
            </p>
            <div className="mb-6 rounded-[var(--radius-inner)] bg-well p-4 shadow-recessed">
              <div className="flex items-center justify-between py-2">
                <span className="text-[14px] font-medium text-ink">Days to go</span>
                <span className="text-[14px] font-bold tabular-nums text-ink">208</span>
              </div>
              <div className="flex items-center justify-between border-t border-hairline py-2">
                <span className="text-[14px] font-medium text-ink">Checklist</span>
                <Pill variant="sage">68% done</Pill>
              </div>
              <div className="flex items-center justify-between border-t border-hairline py-2">
                <span className="text-[14px] font-medium text-ink">Budget</span>
                <Pill variant="clay">$16k committed</Pill>
              </div>
            </div>
            <ButtonLink href="/signup">Plan your wedding</ButtonLink>
          </article>
        </ScrollReveal>

        <ScrollReveal delayMs={80}>
          <article className="marketing-card-hover h-full rounded-[var(--radius-card)] bg-surface p-7 shadow-raised md:p-8">
            <Eyebrow className="block">For planners</Eyebrow>
            <h3 className="mt-3 text-[22px] font-extrabold tracking-[-0.02em] text-ink md:text-[24px]">
              Every client wedding at a glance
            </h3>
            <p className="mt-2.5 mb-5 text-[15px] leading-relaxed text-muted md:text-[16px]">
              See which clients need you — then open the same stack your couple
              uses, with outreach and RSVPs already in motion.
            </p>
            <div className="mb-6 rounded-[var(--radius-inner)] bg-well p-4 shadow-recessed">
              <div className="flex items-center justify-between py-2">
                <span className="text-[14px] font-medium text-ink">
                  Mila &amp; Griffin
                </span>
                <Pill variant="rosewood">2 overdue</Pill>
              </div>
              <div className="flex items-center justify-between border-t border-hairline py-2">
                <span className="text-[14px] font-medium text-ink">Sana &amp; Theo</span>
                <Pill variant="clay">reply needed</Pill>
              </div>
              <div className="flex items-center justify-between border-t border-hairline py-2">
                <span className="text-[14px] font-medium text-ink">Ivy &amp; Ren</span>
                <Pill variant="sage">on track</Pill>
              </div>
            </div>
            <ButtonLink href="/signup">Run your studio</ButtonLink>
          </article>
        </ScrollReveal>
      </div>
    </section>
  );
}
