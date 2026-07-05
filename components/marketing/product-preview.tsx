import { CountUp } from "@/components/ui/count-up";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { RevealOnScroll } from "@/components/ui/reveal-on-scroll";

function PreviewStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-stone bg-surface px-4 py-3.5 shadow-card">
      <div className="font-display tabnum text-[32px] leading-none tracking-[-0.01em] text-plum md:text-[40px]">
        <CountUp value={value} />
      </div>
      <div className="mt-2 text-xs text-ink-muted md:text-[13px]">{label}</div>
    </div>
  );
}

export function ProductPreview() {
  return (
    <section className="mx-auto max-w-[1180px] px-6 pb-20">
      <RevealOnScroll>
        <div className="overflow-hidden rounded-[18px] border border-stone bg-surface shadow-card">
          <div className="flex items-center gap-2 border-b border-stone-soft bg-surface-2 px-4 py-3 md:px-5">
            <div className="flex gap-1.5" aria-hidden>
              <span className="size-[11px] rounded-full bg-stone" />
              <span className="size-[11px] rounded-full bg-stone" />
              <span className="size-[11px] rounded-full bg-stone" />
            </div>
            <span className="ml-3 font-mono text-xs text-ink-muted md:text-[12.5px]">
              firstlook.app/dashboard
            </span>
            <span className="ml-auto hidden text-[11px] font-medium uppercase tracking-[0.14em] text-plum sm:inline">
              Planner · dashboard
            </span>
          </div>

          <div className="bg-canvas p-4 md:p-6">
            <div className="mb-4 flex items-center gap-2.5 border-b border-stone pb-4">
              <span className="size-[9px] rounded-full bg-plum" aria-hidden />
              <span className="font-display text-xl text-ink md:text-[25px]">First Look</span>
            </div>

            <div className="flex flex-col gap-5 lg:flex-row lg:gap-8">
              <RevealOnScroll className="hidden w-[220px] shrink-0 lg:block" delay={100}>
                <aside>
                  <div className="space-y-1">
                    <div className="rounded-[var(--radius)] bg-plum-tint px-3.5 py-2.5 text-sm font-medium text-plum-deep shadow-[inset_2px_0_0_var(--plum)]">
                      Dashboard
                    </div>
                    <div className="rounded-[var(--radius)] px-3.5 py-2.5 text-sm text-ink-soft">
                      Leads
                    </div>
                    <div className="rounded-[var(--radius)] px-3.5 py-2.5 text-sm text-ink-soft">
                      Billing
                    </div>
                  </div>
                  <div className="my-4 h-px bg-stone" />
                  <Eyebrow className="mb-3 block">Active weddings</Eyebrow>
                  <Card className="border-stone px-3.5 py-3">
                    <div className="couple-name text-[18px] leading-tight text-ink">
                      Mila & Griffin
                    </div>
                    <div className="mt-0.5 text-xs text-ink-muted">Nov 14, 2026</div>
                  </Card>
                </aside>
              </RevealOnScroll>

              <div className="min-w-0 flex-1">
                <RevealOnScroll delay={80}>
                  <Eyebrow className="mb-2 block">Planning</Eyebrow>
                  <h2 className="font-display text-[clamp(32px,5vw,46px)] leading-none tracking-[-0.01em] text-ink">
                    Dashboard
                  </h2>
                  <p className="mt-2 text-sm text-ink-muted md:text-base">
                    Your weddings at a glance.
                  </p>
                </RevealOnScroll>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <RevealOnScroll delay={160}>
                    <PreviewStat value={3} label="Active weddings" />
                  </RevealOnScroll>
                  <RevealOnScroll delay={240}>
                    <PreviewStat value={7} label="Tasks due this week" />
                  </RevealOnScroll>
                  <RevealOnScroll delay={320}>
                    <PreviewStat value={2} label="Vendors needing action" />
                  </RevealOnScroll>
                </div>

                <RevealOnScroll className="mt-6" delay={400}>
                  <div className="rounded-lg border border-transparent bg-plum-tint px-5 py-8 text-center">
                    <p className="font-display text-lg text-plum-deep md:text-[21px]">
                      Nothing urgent right now — you&apos;re in good shape.
                    </p>
                  </div>
                </RevealOnScroll>
              </div>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
