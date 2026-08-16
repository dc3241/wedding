"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarEventPanel,
  type CalendarEventMutations,
} from "./CalendarEventPanel";
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
  PaymentDueOverlay,
  TaskDueOverlay,
} from "./types";
import {
  CalendarEventChip,
  type CalendarChipStatus,
} from "@/components/calendar/CalendarEventChip";
import { CalendarLegend } from "@/components/calendar/CalendarLegend";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { kindGlyph, kindHue, weddingHue } from "@/lib/calendar-hues";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format-currency";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CHIP_LIMIT = 3;

/** Map a calendar cell item to the CAL-03 kind key (0045 or synthetic). */
function itemKindKey(item: CalendarItem): string {
  if (item.source === "wedding") return "wedding";
  if (item.source === "payment") return "payment";
  if (item.source === "task") return "task";
  return item.kind ?? "other";
}

function itemChipStatus(item: CalendarItem): CalendarChipStatus | undefined {
  // Best-effort from data the cell already carries — no new past-due math.
  // Task overlays exclude status=done at query time, so "done" never appears today.
  if (item.pastDue) return "overdue";
  return undefined;
}

function itemChipTitle(item: CalendarItem): string {
  if (item.source === "payment" && item.amount != null) {
    return `${formatCurrency(item.amount)} · ${item.title}`;
  }
  return item.title;
}

type PanelState =
  | null
  | { type: "create"; date: string }
  | { type: "edit"; event: CalendarEventRow }
  | { type: "day"; date: string };

function OverlayIcon({
  source,
  pastDue,
}: {
  source: "wedding" | "payment" | "task";
  pastDue?: boolean;
}) {
  const tone = pastDue ? "text-rosewood" : "text-muted";
  if (source === "wedding") {
    return (
      <span
        className="size-1.5 shrink-0 rounded-full bg-sage"
        aria-hidden
        title="Wedding day"
      />
    );
  }
  if (source === "payment") {
    return (
      <span className={cn("shrink-0 text-[10px] font-bold", tone)} aria-hidden>
        $
      </span>
    );
  }
  return (
    <span className={cn("shrink-0 text-[10px] font-bold", tone)} aria-hidden>
      ✓
    </span>
  );
}

function EventChip({
  item,
  audience,
  onClick,
}: {
  item: CalendarItem;
  audience: "planner" | "couple";
  onClick?: () => void;
}) {
  const kindKey = itemKindKey(item);
  const hueVar =
    audience === "planner" && item.projectId
      ? weddingHue(item.projectId)
      : kindHue(kindKey);

  return (
    <CalendarEventChip
      title={itemChipTitle(item)}
      glyph={kindGlyph(kindKey)}
      hueVar={hueVar}
      timeLabel={item.timeLabel}
      status={itemChipStatus(item)}
      href={item.href}
      onClick={
        item.source === "authored" && onClick ? onClick : undefined
      }
    />
  );
}

function ItemRow({
  item,
  onEdit,
  hideProjectName,
}: {
  item: CalendarItem;
  onEdit: (event: CalendarEventRow) => void;
  hideProjectName?: boolean;
}) {
  const isWedding = item.source === "wedding";
  const isPayment = item.source === "payment";
  const isTask = item.source === "task";
  const isOverlay = isWedding || isPayment || isTask;
  const pastDue = Boolean(item.pastDue);

  const title =
    isPayment && item.amount != null
      ? `${formatCurrency(item.amount)} · ${item.title}`
      : item.title;

  const body = (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {isOverlay ? (
            <OverlayIcon
              source={item.source as "wedding" | "payment" | "task"}
              pastDue={pastDue}
            />
          ) : null}
          <span
            className={cn(
              "truncate text-[15px] font-semibold",
              pastDue ? "text-rosewood" : "text-ink",
            )}
          >
            {title}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.kind ? (
            <Pill variant="default">{formatKindLabel(item.kind)}</Pill>
          ) : null}
          {isWedding ? <Pill variant="sage">Wedding day</Pill> : null}
          {isPayment ? (
            <Pill variant={pastDue ? "rosewood" : "default"}>Payment due</Pill>
          ) : null}
          {isTask ? (
            <Pill variant={pastDue ? "rosewood" : "default"}>Task due</Pill>
          ) : null}
          {!hideProjectName && !isWedding && item.projectName ? (
            <Pill variant="default">{item.projectName}</Pill>
          ) : null}
          {item.timeLabel ? (
            <span className="text-[13px] tabular-nums text-muted">
              {item.timeLabel}
            </span>
          ) : item.allDay && !isOverlay ? (
            <span className="text-[13px] text-muted">All day</span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (isPayment || isTask) {
    if (item.href) {
      return (
        <Link
          href={item.href}
          className="block rounded-[var(--radius-inner)] bg-well px-3.5 py-3 shadow-recessed hover:bg-accent-wash/40"
        >
          {body}
        </Link>
      );
    }
    return (
      <div className="rounded-[var(--radius-inner)] bg-well px-3.5 py-3 shadow-recessed">
        {body}
      </div>
    );
  }

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
      {body}
    </div>
  );
}

function OverlayToggle({
  label,
  pressed,
  onPressedChange,
}: {
  label: string;
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "rounded-[var(--radius-pill)] px-3 py-1.5 text-[13px] font-semibold transition-colors",
        pressed
          ? "bg-accent-wash text-accent"
          : "bg-well text-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

export function CalendarWorkspace({
  year,
  month,
  events,
  weddings,
  payments = [],
  tasks = [],
  basePath = "/calendar",
  lockedProjectId,
  mutations,
  weddingOverlayLabel = "Weddings",
  hideProjectName = false,
  railWidth = "fluid",
}: {
  year: number;
  month: number;
  events: CalendarEventRow[];
  weddings: ActiveWedding[];
  payments?: PaymentDueOverlay[];
  tasks?: TaskDueOverlay[];
  /** Month nav + deep-link base (planner `/calendar` or project calendar). */
  basePath?: string;
  lockedProjectId?: string;
  mutations?: CalendarEventMutations;
  weddingOverlayLabel?: string;
  hideProjectName?: boolean;
  /**
   * `"fluid"` — current planner split (`1.55fr` / `1fr`).
   * `"fixed"` — calendar column grows; Upcoming rail stays ~340px (project calendar).
   */
  railWidth?: "fluid" | "fixed";
}) {
  const [panel, setPanel] = useState<PanelState>(null);
  // Client-only "today" avoids SSR/client day-boundary mismatch.
  const [todayKey] = useState(() => toLocalDateKey(new Date()));
  const [showWeddings, setShowWeddings] = useState(true);
  const [showPayments, setShowPayments] = useState(true);
  const [showTasks, setShowTasks] = useState(true);
  // Couple project calendar locks to one project; planner account calendar does not.
  const audience: "planner" | "couple" = lockedProjectId
    ? "couple"
    : "planner";

  function monthHref(y: number, m: number) {
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    return `${basePath}?ym=${ym}`;
  }

  const allItems = useMemo(
    () => buildCalendarItems(events, weddings, payments, tasks),
    [events, weddings, payments, tasks],
  );

  const items = useMemo(
    () =>
      allItems.filter((item) => {
        if (item.source === "wedding") return showWeddings;
        if (item.source === "payment") return showPayments;
        if (item.source === "task") return showTasks;
        return true;
      }),
    [allItems, showWeddings, showPayments, showTasks],
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
    <div
      className={cn(
        "grid grid-cols-1 gap-6 lg:items-start lg:gap-8",
        railWidth === "fixed"
          ? "lg:grid-cols-[minmax(0,1fr)_340px]"
          : "lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]",
      )}
    >
      <Card className="min-w-0 overflow-hidden p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            {formatMonthHeading(year, month)}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLinkLike href={monthHref(prev.year, prev.month)}>
              Prev
            </ButtonLinkLike>
            <ButtonLinkLike href={monthHref(today.getFullYear(), today.getMonth() + 1)}>
              Today
            </ButtonLinkLike>
            <ButtonLinkLike href={monthHref(next.year, next.month)}>
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

        <div className="mb-4 flex flex-wrap gap-2">
          <OverlayToggle
            label={weddingOverlayLabel}
            pressed={showWeddings}
            onPressedChange={setShowWeddings}
          />
          <OverlayToggle
            label="Payments due"
            pressed={showPayments}
            onPressedChange={setShowPayments}
          />
          <OverlayToggle
            label="Tasks due"
            pressed={showTasks}
            onPressedChange={setShowTasks}
          />
        </div>

        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="min-w-0 truncate px-0.5 text-center text-[11px] font-semibold uppercase tracking-[0.04em] text-muted sm:px-1 sm:text-[12px] sm:tracking-[0.09em]"
            >
              <span className="sm:hidden">{d.slice(0, 1)}</span>
              <span className="hidden sm:inline">{d}</span>
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
              <div
                key={cell.localDate}
                onClick={() => setPanel({ type: "day", date: cell.localDate })}
                className={cn(
                  "flex min-h-[88px] min-w-0 cursor-pointer flex-col gap-1 rounded-[var(--radius-inner)] bg-well p-1.5 text-left shadow-recessed transition-colors",
                  "hover:bg-accent-wash/50",
                  !cell.inMonth && "opacity-45",
                  selected && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
                  isToday && "bg-accent-wash/80",
                )}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPanel({ type: "day", date: cell.localDate });
                  }}
                  className={cn(
                    "w-fit rounded-[var(--radius-inner)] text-[13px] font-semibold tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    isToday ? "text-accent" : "text-muted",
                  )}
                >
                  {Number(cell.localDate.slice(8, 10))}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  {visible.map((item) => (
                    <EventChip
                      key={item.id}
                      item={item}
                      audience={audience}
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
              </div>
            );
          })}
        </div>

        <CalendarLegend audience={audience} weddings={weddings} />
      </Card>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        {panel?.type === "create" || panel?.type === "edit" ? (
          <CalendarEventPanel
            mode={panel}
            weddings={weddings}
            lockedProjectId={lockedProjectId}
            mutations={mutations}
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
                    hideProjectName={hideProjectName}
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
                      hideProjectName={hideProjectName}
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
