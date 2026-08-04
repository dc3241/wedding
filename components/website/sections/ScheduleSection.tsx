import type { ScheduleLayout, ScheduleItem, WeddingWebsiteContent } from "../types";
import { Band, Wrap } from "../layout";
import { SectionHead } from "./SectionHead";
import { showSchedule, type SectionVariant } from "./section-meta";
import { cn } from "@/lib/cn";

type ScheduleSectionProps = {
  content: WeddingWebsiteContent;
  variant: SectionVariant;
  tint?: boolean;
};

function resolveScheduleLayout(layout: ScheduleLayout | undefined): ScheduleLayout {
  return layout ?? "centered";
}

function TimelineDot({ className }: { className?: string }) {
  return (
    <span className={cn("block", className)} aria-hidden>
      <span
        className="relative block size-[19px] rounded-full"
        style={{
          background: "var(--ws-surface)",
          border: "1px solid var(--ws-accent)",
        }}
      >
        <span
          className="absolute inset-[5px] rounded-full"
          style={{ background: "var(--ws-accent)" }}
        />
      </span>
    </span>
  );
}

function ScheduleItemBody({
  item,
  align,
}: {
  item: ScheduleItem;
  align: "left" | "center" | "right";
}) {
  return (
    <div
      className={cn(
        align === "center" && "text-center",
        align === "right" && "text-right",
        align === "left" && "text-left",
      )}
    >
      {item.time ? (
        <p
          className="m-0 mb-1 text-[12px] tracking-[0.16em] uppercase"
          style={{ color: "var(--ws-accent)" }}
        >
          {item.time}
        </p>
      ) : null}
      <h4
        className="font-serif-display m-0 mb-1 text-[22px] font-medium"
        style={{ color: "var(--ws-ink)" }}
      >
        {item.title}
      </h4>
      {item.description ? (
        <p className="m-0 text-[15px]" style={{ color: "var(--ws-muted)" }}>
          {item.description}
        </p>
      ) : null}
    </div>
  );
}

function RailTimeline({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="relative mx-auto max-w-[640px] pl-[38px]">
      <div
        className="absolute top-1.5 bottom-1.5 left-[9px] w-px"
        style={{ background: "var(--ws-border)" }}
        aria-hidden
      />
      <ul className="m-0 list-none space-y-0 p-0">
        {items.map((item, index) => (
          <li
            key={`${item.time}-${item.title}-${index}`}
            className="relative pb-[34px] last:pb-0"
          >
            <TimelineDot className="absolute top-1 -left-[38px]" />
            <ScheduleItemBody item={item} align="left" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CenteredTimeline({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="relative mx-auto max-w-[560px]">
      <div
        className="absolute top-1.5 bottom-1.5 left-1/2 w-px -translate-x-1/2"
        style={{ background: "var(--ws-border)" }}
        aria-hidden
      />
      <ul className="m-0 list-none space-y-0 p-0">
        {items.map((item, index) => (
          <li
            key={`${item.time}-${item.title}-${index}`}
            className="relative pb-10 last:pb-0"
          >
            <TimelineDot className="absolute top-1 left-1/2 -translate-x-1/2" />
            <div className="px-4 pt-9">
              <ScheduleItemBody item={item} align="center" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlternatingTimeline({ items }: { items: ScheduleItem[] }) {
  return (
    <div className="relative mx-auto max-w-[760px]">
      <div
        className="absolute top-1.5 bottom-1.5 left-1/2 hidden w-px -translate-x-1/2 sm:block"
        style={{ background: "var(--ws-border)" }}
        aria-hidden
      />
      {/* Mobile: same as centered */}
      <div
        className="absolute top-1.5 bottom-1.5 left-1/2 w-px -translate-x-1/2 sm:hidden"
        style={{ background: "var(--ws-border)" }}
        aria-hidden
      />
      <ul className="m-0 list-none space-y-0 p-0">
        {items.map((item, index) => {
          const onLeft = index % 2 === 0;
          return (
            <li
              key={`${item.time}-${item.title}-${index}`}
              className="relative pb-10 last:pb-0 sm:pb-12"
            >
              {/* Mobile centered stack */}
              <div className="sm:hidden">
                <TimelineDot className="absolute top-1 left-1/2 -translate-x-1/2" />
                <div className="px-4 pt-9">
                  <ScheduleItemBody item={item} align="center" />
                </div>
              </div>

              {/* Desktop alternating */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-start sm:gap-6">
                <div className={cn(!onLeft && "invisible")} aria-hidden={!onLeft}>
                  {onLeft ? <ScheduleItemBody item={item} align="right" /> : null}
                </div>
                <TimelineDot className="relative top-1 shrink-0" />
                <div className={cn(onLeft && "invisible")} aria-hidden={onLeft}>
                  {!onLeft ? <ScheduleItemBody item={item} align="left" /> : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ScheduleSection({ content, variant, tint }: ScheduleSectionProps) {
  if (!showSchedule(content)) return null;

  const { schedule } = content;
  const layout = resolveScheduleLayout(schedule.layout);

  return (
    <Band id="schedule" tint={tint}>
      <Wrap>
        <SectionHead
          variant={variant}
          eyebrow={variant === "minimalist" || variant === "editorial" ? undefined : "Timeline"}
        >
          {variant === "editorial" ? "Schedule" : "How the day unfolds"}
        </SectionHead>
        {layout === "rail" ? (
          <RailTimeline items={schedule.items} />
        ) : layout === "alternating" ? (
          <AlternatingTimeline items={schedule.items} />
        ) : (
          <CenteredTimeline items={schedule.items} />
        )}
      </Wrap>
    </Band>
  );
}
