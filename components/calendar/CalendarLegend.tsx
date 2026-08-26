import {
  CALENDAR_KIND_LEGEND,
  weddingHue,
} from "@/lib/calendar-hues";

type WeddingSwatch = {
  id: string;
  name: string;
};

type CalendarLegendProps = {
  /** Planner shows Weddings; couple shows Status. */
  audience: "planner" | "couple";
  /** Active weddings already scoped by the page (`archived_at is null`). */
  weddings?: WeddingSwatch[];
};

/**
 * Kind (+ Weddings or Status) legend under the month grid (CAL-03).
 */
export function CalendarLegend({
  audience,
  weddings = [],
}: CalendarLegendProps) {
  const weddingIds = weddings.map((w) => w.id);

  return (
    <div className="mt-4 flex flex-col gap-2.5 border-t border-hairline pt-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="w-16 shrink-0 text-[10.5px] font-bold tracking-[0.06em] text-muted uppercase">
          Kind
        </span>
        {CALENDAR_KIND_LEGEND.map((entry) => (
          <span
            key={entry.key}
            className="inline-flex items-center gap-1.5 text-[12px] text-ink"
          >
            <span className="text-[11px] opacity-85" aria-hidden>
              {entry.glyph}
            </span>
            {entry.label}
          </span>
        ))}
      </div>

      {audience === "planner" ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="w-16 shrink-0 text-[10.5px] font-bold tracking-[0.06em] text-muted uppercase">
            Weddings
          </span>
          {weddings.map((wedding) => (
            <span
              key={wedding.id}
              className="inline-flex items-center gap-1.5 text-[12px] text-ink"
            >
              <span
                className="size-[11px] shrink-0 rounded-[3px]"
                style={{
                  background: `var(${weddingHue(wedding.id, weddingIds)})`,
                }}
                aria-hidden
              />
              {wedding.name}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="w-16 shrink-0 text-[10.5px] font-bold tracking-[0.06em] text-muted uppercase">
            Status
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink">
            <span
              className="size-[11px] shrink-0 rounded-[3px] bg-rosewood"
              aria-hidden
            />
            Overdue
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink">
            <span
              className="size-[11px] shrink-0 rounded-[3px] bg-sage"
              aria-hidden
            />
            Done
          </span>
        </div>
      )}
    </div>
  );
}
