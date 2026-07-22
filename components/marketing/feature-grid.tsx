import { AnimateWidth } from "@/components/marketing/animate-width";
import { ScrollReveal } from "@/components/marketing/scroll-reveal";
import { SeatingPreviewFigures } from "@/components/marketing/seating-preview-figures";
import { WebsitePreviewThumb } from "@/components/marketing/website-preview-thumb";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Pill } from "@/components/ui/pill";

function CheckMini({ done }: { done?: boolean }) {
  return (
    <span
      className={
        done
          ? "flex size-4 shrink-0 items-center justify-center rounded-[5px] border-2 border-sage bg-sage text-surface"
          : "size-4 shrink-0 rounded-[5px] border-2 border-ring bg-surface"
      }
      aria-hidden
    >
      {done ? (
        <svg width="9" height="9" viewBox="0 0 20 20" fill="none">
          <path
            d="M4 10l4 4 8-9"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

function ChecklistDemo() {
  return (
    <div className="rounded-[var(--radius-inner)] bg-well p-3.5 shadow-recessed">
      <div className="mb-3 h-2 overflow-hidden rounded-[var(--radius-pill)] bg-surface shadow-recessed">
        <AnimateWidth widthPercent={68} className="rounded-[var(--radius-pill)] bg-sage" />
      </div>
      <div className="flex items-center gap-2.5 py-1.5">
        <CheckMini done />
        <span className="text-[13px] font-medium text-muted line-through">
          Confirm florist delivery window
        </span>
      </div>
      <div className="flex items-center gap-2.5 py-1.5">
        <CheckMini />
        <span className="text-[13px] font-medium text-ink">
          Book hair &amp; makeup trial
        </span>
      </div>
    </div>
  );
}

function AssistantDemo() {
  return (
    <div className="rounded-[var(--radius-inner)] bg-well p-3.5 shadow-recessed">
      <div className="mb-2.5 flex justify-end">
        <p className="max-w-[90%] rounded-[var(--radius-inner)] bg-surface px-3 py-2 text-[13px] font-medium text-ink shadow-raised">
          Mark florist delivery as done and add a hair trial for next week.
        </p>
      </div>
      <div className="rounded-[var(--radius-inner)] bg-surface px-3 py-2.5 shadow-raised">
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">
          Assistant
        </p>
        <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink">
          Done — florist confirmed, and &ldquo;Book hair &amp; makeup trial&rdquo;
          is on the checklist.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Pill variant="sage">1 task done</Pill>
          <Pill variant="clay">1 task added</Pill>
        </div>
      </div>
    </div>
  );
}

function VendorsDemo() {
  return (
    <div className="rounded-[var(--radius-inner)] bg-well px-3.5 py-1 shadow-recessed">
      {/* Live outreach pills: booked=sage, contacted=default, to_contact=default */}
      <div className="flex items-center justify-between border-b border-hairline py-2.5">
        <span className="text-[13.5px] font-medium text-ink">
          Bloom &amp; Bramble · Florist
        </span>
        <Pill variant="sage">Booked</Pill>
      </div>
      <div className="flex items-center justify-between border-b border-hairline py-2.5">
        <span className="text-[13.5px] font-medium text-ink">Highline Catering</span>
        <Pill variant="clay">Replied</Pill>
      </div>
      <div className="flex items-center justify-between py-2.5">
        <span className="text-[13.5px] font-medium text-ink">
          Aperture Studio · Photo
        </span>
        <Pill variant="default">To contact</Pill>
      </div>
    </div>
  );
}

function SeatingDemo() {
  return (
    <div className="rounded-[var(--radius-inner)] bg-well p-2.5 shadow-recessed">
      <SeatingPreviewFigures variant="compact" />
    </div>
  );
}

function TimelineDemo() {
  return (
    <div className="rounded-[var(--radius-inner)] bg-well px-3.5 py-1 shadow-recessed">
      {[
        { time: "2:00", title: "First look photos", owner: "Photo" },
        { time: "4:30", title: "Ceremony begins", owner: "Planner" },
        { time: "6:15", title: "Dinner service", owner: "Catering" },
      ].map((row, i) => (
        <div
          key={row.time}
          className={
            i === 0
              ? "flex items-center gap-3 py-2"
              : "flex items-center gap-3 border-t border-hairline py-2"
          }
        >
          <span className="w-[52px] shrink-0 text-[12px] font-bold tabular-nums text-muted">
            {row.time}
          </span>
          <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">
            {row.title}
          </span>
          {/* Live TimelineEventRow: owner = Pill accent */}
          <Pill variant="accent">{row.owner}</Pill>
        </div>
      ))}
    </div>
  );
}

const features = [
  {
    title: "Checklist that actually moves",
    body: "Stay ahead without rebuilding the plan every Sunday — phases and due dates in one progress band.",
    demo: <ChecklistDemo />,
    delay: 0,
  },
  {
    title: "Your wedding assistant",
    body: "Type a request in plain language — update tasks, adjust the budget, find vendors. Changes land in your workspace.",
    demo: <AssistantDemo />,
    delay: 50,
  },
  {
    title: "Vendors with a paper trail",
    body: "Find vendors, draft outreach, and send from your own Gmail — status stays in one place, not buried threads.",
    demo: <VendorsDemo />,
    delay: 100,
  },
  {
    title: "Guests & seating together",
    body: "Guests RSVP on your site; the list and seating update with them — tracking tied to your floor plan.",
    demo: <SeatingDemo />,
    delay: 0,
  },
  {
    title: "Day-of timeline",
    body: "A run sheet that already matches the plan you built — vendors get one sheet, not a scavenger hunt.",
    demo: <TimelineDemo />,
    delay: 50,
  },
  {
    title: "Website that matches the day",
    body: "A romantic public site for guests, with RSVP intake that feeds your workspace — calm chrome for you.",
    demo: <WebsitePreviewThumb />,
    delay: 100,
  },
] as const;

export function FeatureGrid() {
  return (
    <section
      id="features"
      className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20"
    >
      <ScrollReveal className="mb-11 max-w-[60ch]">
        <Eyebrow className="mb-4 block">The workspace</Eyebrow>
        <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
          Everything you need. Nothing decorative in the way.
        </h2>
      </ScrollReveal>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <ScrollReveal key={f.title} delayMs={f.delay}>
            <article className="marketing-card-hover flex h-full flex-col rounded-[var(--radius-card)] bg-surface p-6 shadow-raised">
              <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                {f.title}
              </h3>
              <p className="mt-2 mb-4 flex-1 text-[14.5px] leading-relaxed text-muted">
                {f.body}
              </p>
              {f.demo}
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
