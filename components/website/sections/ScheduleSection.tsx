import type { WeddingWebsiteContent } from "../types";
import { Band, Wrap } from "../layout";
import { SectionHead } from "./SectionHead";
import { showSchedule, type SectionVariant } from "./section-meta";

type ScheduleSectionProps = {
  content: WeddingWebsiteContent;
  variant: SectionVariant;
  tint?: boolean;
};

export function ScheduleSection({ content, variant, tint }: ScheduleSectionProps) {
  if (!showSchedule(content)) return null;

  const { schedule } = content;

  return (
    <Band id="schedule" tint={tint}>
      <Wrap>
        <SectionHead
          variant={variant}
          eyebrow={variant === "minimalist" || variant === "editorial" ? undefined : "Timeline"}
        >
          {variant === "editorial" ? "Schedule" : "How the day unfolds"}
        </SectionHead>
        <div className="relative mx-auto max-w-[640px] pl-[38px]">
          <div
            className="absolute top-1.5 bottom-1.5 left-[9px] w-px"
            style={{ background: "var(--ws-border)" }}
            aria-hidden
          />
          <ul className="m-0 list-none space-y-0 p-0">
            {schedule.items.map((item, index) => (
              <li
                key={`${item.time}-${item.title}-${index}`}
                className="relative pb-[34px] last:pb-0"
              >
                <span
                  className="absolute top-1 -left-[38px] size-[19px] rounded-full"
                  style={{
                    background: "var(--ws-surface)",
                    border: "1px solid var(--ws-accent)",
                  }}
                  aria-hidden
                >
                  <span
                    className="absolute inset-[5px] rounded-full"
                    style={{ background: "var(--ws-accent)" }}
                  />
                </span>
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
              </li>
            ))}
          </ul>
        </div>
      </Wrap>
    </Band>
  );
}
