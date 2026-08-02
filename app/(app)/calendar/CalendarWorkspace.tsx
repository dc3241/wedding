"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { CalendarEventPanel } from "./CalendarEventPanel";
import {
  buildCalendarItems,
  buildMonthGrid,
  formatKindLabel,
  formatMonthHeading,
  formatRailDay,
  itemsOnDate,
  shiftMonth,
  toLocalDateKey,
  upcomingItems,
} from "./calendar-source";
import type {
  ActiveWedding,
  CalendarEventRow,
  CalendarItem,
} from "./types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CHIP_LIMIT = 3;

type PanelState =
  | null
  | { type: "create"; date: string }
  | { type: "edit"; event: CalendarEventRow }
  | { type: "day"; date: string };

function EventChip({
  item,
  onClick,
}: {
  item: CalendarItem;
  onClick?: () => void;
}) {
  const isWedding = item.source === "wedding";
  const interactive = item.source === "authored" && onClick;

  const content = (
    <>
      <span className="truncate">{item.title}</span>
      {item.timeLabel ? (
        <span className="shrink-0 tabular-nums opacity-80">{item.timeLabel}</span>
      ) : null}
    </>
  );

  if (isWedding) {
    return (
      <div
        className="flex items-center gap-1 truncate rounded-[var(--radius-pill)] bg-well px-1.5 py-0.5 text-[11px] font-semibold text-sage"
        title={`${item.title} — wedding day`}
      >
        <span
          className="size-1.5 shrink-0 rounded-full bg-sage"
          aria-hidden
        />
        {content}
      </div>
    );
  }

  if (interactive) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="flex w-full items-center gap-1 truncate rounded-[var(--radius-pill)] bg-surface px-1.5 py-0.5 text-left text-[11px] font-semibold text-ink shadow-raised hover:bg-accent-wash hover:text-accent"
        title={item.title}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 truncate rounded-[var(--radius-pill)] bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink shadow-raised">
      {content}
    </div>
  );
}

function ItemRow({
  item,
  onEdit,
}: {
  item: CalendarItem;
  onEdit: (event: CalendarEventRow) => void;
}) {
  const isWedding = item.source === "wedding";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-inner)] bg-well px-3.5 py-3 shadow-recessed",
        !isWedding && "cursor-pointer hover:bg-accent-wash/60",
      )}
      role={isWedding ? undefined : "button"}
      tabIndex={isWedding ? undefined : 0}
      onClick={
        isWedding || !item.authored
          ? undefined
          : () => onEdit(item.authored!)
      }
      onKeyDown={
        isWedding || !item.authored
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit(item.authored!);
              }
            }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {isWedding ? (
              <span className="size-2 shrink-0 rounded-full bg-sage" aria-hidden />
            ) : null}
            <span className="truncate text-[15px] font-semibold text-ink">
              {item.title}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.kind ? (
              <Pill variant="default">{formatKindLabel(item.kind)}</Pill>
            ) : null}
            {isWedding ? <Pill variant="sage">Wedding day</Pill> : null}
            {!isWedding && item.projectName ? (
              <Pill variant="default">{item.projectName}</Pill>
            ) : null}
            {item.timeLabel ? (
              <span className="text-[13px] tabular-nums text-muted">
                {item.timeLabel}
              </span>
            ) : item.allDay && !isWedding ? (
              <span className="text-[13px] text-muted">All day</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarWorkspace({
  year,
  month,
  events,
  weddings,
}: {
  year: number;
  month: number;
  events: CalendarEventRow[];
  weddings: ActiveWedding[];
}) {
  const [panel, setPanel] = useState<PanelState>(null);
  // Client-only "today" avoids SSR/client day-boundary mismatch.
  const [todayKey] = useState(() => toLocalDateKey(new Date()));

  const items = useMemo(
    () => buildCalendarItems(events, weddings),
    [events, weddings],
  );

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const list = map.get(item.localDate) ?? [];
      list.push(item);
      map.set(item.localDate, list);
    }
    return map;
  }, [items]);

  const upcoming = useMemo(
    () => upcomingItems(items, todayKey, 7),
    [items, todayKey],
  );

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const today = new Date();
  const todayYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const dayDetailDate =
    panel?.type === "day"
      ? panel.date
      : panel?.type === "create"
        ? panel.date
        : null;
  const dayDetailItems = dayDetailDate
    ? itemsOnDate(items, dayDetailDate)
    : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
      <Card className="overflow-hidden p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            {formatMonthHeading(year, month)}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLinkLike href={`/calendar?ym=${prev.year}-${String(prev.month).padStart(2, "0")}`}>
              Prev
            </ButtonLinkLike>
            <ButtonLinkLike href={`/calendar?ym=${todayYm}`}>
              Today
            </ButtonLinkLike>
            <ButtonLinkLike href={`/calendar?ym=${next.year}-${String(next.month).padStart(2, "0")}`}>
              Next
            </ButtonLinkLike>
            <Button
              type="button"
              onClick={() =>
                setPanel({ type: "create", date: todayKey })
              }
            >
              Add event
            </Button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-1 text-center text-[12px] font-semibold uppercase tracking-[0.09em] text-muted"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell) => {
            const dayItems = byDate.get(cell.localDate) ?? [];
            const visible = dayItems.slice(0, CHIP_LIMIT);
            const overflow = dayItems.length - visible.length;
            const isToday = cell.localDate === todayKey;
            const selected = dayDetailDate === cell.localDate;

            return (
              <button
                key={cell.localDate}
                type="button"
                onClick={() => setPanel({ type: "day", date: cell.localDate })}
                className={cn(
                  "flex min-h-[92px] flex-col gap-1 rounded-[var(--radius-inner)] bg-well p-1.5 text-left shadow-recessed transition-colors",
                  "hover:bg-accent-wash/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  !cell.inMonth && "opacity-45",
                  selected && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
                  isToday && "bg-accent-wash/80",
                )}
              >
                <span
                  className={cn(
                    "text-[13px] font-semibold tabular-nums",
                    isToday ? "text-accent" : "text-muted",
                  )}
                >
                  {Number(cell.localDate.slice(8, 10))}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {visible.map((item) => (
                    <EventChip
                      key={item.id}
                      item={item}
                      onClick={
                        item.source === "authored" && item.authored
                          ? () =>
                              setPanel({
                                type: "edit",
                                event: item.authored!,
                              })
                          : undefined
                      }
                    />
                  ))}
                  {overflow > 0 ? (
                    <span className="px-1 text-[11px] font-medium text-muted">
                      +{overflow} more
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        {panel?.type === "create" || panel?.type === "edit" ? (
          <CalendarEventPanel
            mode={panel}
            weddings={weddings}
            onClose={() => setPanel(null)}
          />
        ) : null}

        {panel?.type === "day" ? (
          <Card className="px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
                {formatRailDay(panel.date)}
              </h2>
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="text-[14px] font-semibold text-muted hover:text-ink"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {dayDetailItems.length === 0 ? (
                <p className="text-[14px] font-medium text-muted">
                  Nothing scheduled.
                </p>
              ) : (
                dayDetailItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onEdit={(event) => setPanel({ type: "edit", event })}
                  />
                ))
              )}
            </div>
            <Button
              type="button"
              className="mt-4 w-full"
              onClick={() => setPanel({ type: "create", date: panel.date })}
            >
              Add event
            </Button>
          </Card>
        ) : null}

        <Card className="px-5 py-5">
          <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Upcoming
          </h2>
          <p className="mt-1 text-[13px] font-medium text-muted">
            Next 7 days
          </p>
          <div className="mt-4 space-y-4">
            {upcoming.length === 0 ? (
              <p className="text-[14px] font-medium text-muted">
                Nothing coming up this week.
              </p>
            ) : (
              groupByDate(upcoming).map(([date, dayItems]) => (
                <div key={date} className="space-y-2">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-muted">
                    {formatRailDay(date)}
                  </p>
                  {dayItems.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onEdit={(event) => setPanel({ type: "edit", event })}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ButtonLinkLike({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] border-hairline bg-surface px-4 py-2 text-[14px] font-semibold text-ink transition-colors hover:border-accent hover:text-accent"
    >
      {children}
    </Link>
  );
}

function groupByDate(items: CalendarItem[]): [string, CalendarItem[]][] {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const list = map.get(item.localDate) ?? [];
    list.push(item);
    map.set(item.localDate, list);
  }
  return Array.from(map.entries());
}
