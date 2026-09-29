"use client";

import {
  moveSlotToDay,
  setSlotCheck,
} from "@/app/(admin)/admin/content-week/actions";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateWeekPerformance } from "@/app/(admin)/admin/schedule/actions";
import {
  formatDayHeading,
  formatWeekRange,
  slotAllowsFacebook,
  slotLabel,
  type ContentSlot,
  type IdeaDraft,
} from "@/lib/admin/content-week";
import type { IdeationItem } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Perf = {
  weekId: string;
  views: string | null;
  follower_growth: string | null;
  dms: string | null;
  signups: string | null;
  notes: string | null;
};

type Props = {
  weekStart: string;
  weeks: string[];
  dates: string[];
  today: string;
  slots: ContentSlot[];
  ideas: IdeationItem[];
  drafts: Record<string, IdeaDraft>;
  performance: Perf | null;
};

export function ContentWeekSchedule({
  weekStart,
  weeks,
  dates,
  today,
  slots,
  ideas,
  drafts,
  performance,
}: Props) {
  const router = useRouter();
  const [day, setDay] = useState(dates.includes(today) ? today : dates[0]!);
  const [, startTransition] = useTransition();
  const ideasById = new Map(ideas.map((idea) => [idea.id, idea]));
  const weekOptions = weeks.includes(weekStart) ? weeks : [weekStart, ...weeks];
  const laneOrder: Record<string, number> = { video: 0, slideshow: 1, pin: 2, linkedin: 3 };
  const daySlots = slots
    .filter((slot) => slot.slot_date === day)
    .sort(
      (a, b) =>
        (laneOrder[a.lane] ?? 0) - (laneOrder[b.lane] ?? 0) || a.position - b.position,
    );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-[220px]">
          <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
            Week
          </span>
          <Select
            aria-label="Week"
            value={weekStart}
            onChange={(e) => router.push(`/admin/schedule?week=${e.target.value}`)}
          >
            {weekOptions.map((start) => (
              <option key={start} value={start}>
                {formatWeekRange(start)}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {dates.map((date) => {
          const rows = slots.filter((slot) => slot.slot_date === date);
          const posted = rows.filter((slot) => slot.posted_at).length;
          const active = date === day;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setDay(date)}
              aria-pressed={active}
              className={cn(
                "shrink-0 rounded-[var(--radius-pill)] border-[1.5px] px-3.5 py-1.5 text-[14px] font-medium",
                active
                  ? "border-ink bg-ink text-surface font-semibold"
                  : "border-hairline bg-surface text-muted hover:border-accent hover:text-accent",
              )}
            >
              {formatDayHeading(date).replace(/,?\s+\d{4}$/, "").split(",")[0]}
              <span className="ml-1.5 tabular-nums">
                {posted}/{rows.length}
              </span>
            </button>
          );
        })}
      </div>

      <Card className="px-5 py-5">
        <h2 className="mb-1 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          {formatDayHeading(day)}
        </h2>
        <p className="mb-4 text-[13px] text-muted">
          Draft means the script or images are ready. Posted is you, after it is live.
          A new week shows up on its own when Sunday arrives. This week stays in the list.
        </p>
        <ul className="flex flex-col gap-3">
          {daySlots.map((slot) => {
            const idea = slot.idea_id ? ideasById.get(slot.idea_id) : undefined;
            const draft = slot.idea_id ? drafts[slot.idea_id] : undefined;
            return (
              <SlotRow
                key={slot.id}
                slot={slot}
                idea={idea}
                draft={draft}
                dates={dates}
              />
            );
          })}
        </ul>
      </Card>

      {performance ? (
        <Card className="mt-4 px-5 py-5">
          <h2 className="mb-3 text-[19px] font-extrabold tracking-[-0.02em] text-ink">
            Week performance
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(
              [
                ["views", "Views"],
                ["follower_growth", "Growth"],
                ["dms", "DMs"],
                ["signups", "Sign-ups"],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="block">
                <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
                  {label}
                </span>
                <input
                  defaultValue={performance[field] ?? ""}
                  onBlur={(e) => {
                    const value = e.currentTarget.value;
                    startTransition(async () => {
                      await updateWeekPerformance(performance.weekId, { [field]: value });
                    });
                  }}
                  placeholder="—"
                  className="w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-2.5 py-1.5 text-[15px] font-medium"
                />
              </label>
            ))}
            <div className="col-span-2 md:col-span-4">
              <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
                What drove it
              </span>
              <Textarea
                defaultValue={performance.notes ?? ""}
                onBlur={(e) => {
                  const value = e.currentTarget.value;
                  startTransition(async () => {
                    await updateWeekPerformance(performance.weekId, { notes: value });
                  });
                }}
                rows={2}
              />
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function SlotRow({
  slot,
  idea,
  draft,
  dates,
}: {
  slot: ContentSlot;
  idea: IdeationItem | undefined;
  draft: IdeaDraft | undefined;
  dates: string[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const status = !idea
    ? "Empty"
    : draft?.pending
      ? "Generating"
      : draft?.ready
        ? "Draft"
        : idea.used_at
          ? "Produced"
          : "Chosen";

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update this slot.");
      }
    });
  }

  return (
    <li className="rounded-[var(--radius-inner)] bg-well px-3 py-3 shadow-recessed">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold tracking-[0.09em] text-accent uppercase">
            {slotLabel(slot.lane, slot.position, slot.intent)}
          </div>
          <p className="mt-1 text-[15px] font-medium text-ink">
            {idea?.idea_text ?? "Nothing chosen yet."}
          </p>
        </div>
        <span
          className={cn(
            "text-[13px] font-semibold",
            slot.posted_at ? "text-sage" : "text-muted",
          )}
        >
          {slot.posted_at ? "Posted" : status}
        </span>
      </div>
      {!idea ? (
        <Link href="/admin/ideation" className="mt-2 inline-block text-[13px] font-semibold text-accent">
          Choose on Ideation
        </Link>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {slot.lane === "video" ? (
            <Check
              label="Filmed"
              on={Boolean(slot.filmed_at)}
              onToggle={() => run(() => setSlotCheck(slot.id, "filmed", !slot.filmed_at))}
            />
          ) : null}
          <Check
            label="Posted"
            on={Boolean(slot.posted_at)}
            onToggle={() => run(() => setSlotCheck(slot.id, "posted", !slot.posted_at))}
          />
          {slotAllowsFacebook(slot.lane) ? (
            <Check
              label="Facebook"
              on={Boolean(slot.fb_posted_at)}
              onToggle={() => run(() => setSlotCheck(slot.id, "facebook", !slot.fb_posted_at))}
            />
          ) : null}
          <label className="min-w-[180px] flex-1">
            <span className="sr-only">Move to another day</span>
            <Select
              aria-label={`Move ${slotLabel(slot.lane, slot.position, slot.intent)}`}
              value={slot.slot_date}
              onChange={(e) => {
                const next = e.target.value;
                setError(null);
                if (next === slot.slot_date) return;
                run(() => moveSlotToDay(slot.id, next));
              }}
            >
              {dates.map((date) => (
                <option key={date} value={date}>
                  {formatDayHeading(date)}
                </option>
              ))}
            </Select>
          </label>
        </div>
      )}
      {error ? <p className="mt-2 text-[13px] text-rosewood">{error}</p> : null}
    </li>
  );
}

function Check({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-pill)] border-[1.5px] px-3 py-1.5 text-[14px] font-medium",
        on
          ? "border-sage bg-surface text-sage"
          : "border-ring bg-surface text-muted hover:border-accent",
      )}
    >
      <span
        className={cn(
          "inline-flex size-4 items-center justify-center rounded-[var(--radius-pill)] border text-[11px] font-bold",
          on ? "border-sage bg-sage text-surface" : "border-ring text-transparent",
        )}
      >
        ✓
      </span>
      {label}
    </button>
  );
}
