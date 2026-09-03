"use client";

import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SCHEDULE_PLATFORM_COLS, type DayCellStatus } from "@/lib/admin/platforms";
import type { WeekWithDetail } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { useMemo, useState, useTransition } from "react";
import {
  toggleDayCell,
  updateDayNotes,
  updateWeekPerformance,
} from "@/app/(admin)/admin/schedule/actions";

function formatDayLabel(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
}

function Cell({
  status,
  onToggle,
}: {
  status: DayCellStatus;
  onToggle: () => void;
}) {
  if (status === "off") {
    return <span className="inline-block size-6 text-center text-[15px] text-ring">—</span>;
  }
  const done = status === "done";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-lg border-[1.5px] text-[13px] font-bold transition-colors",
        done
          ? "border-sage bg-sage-wash text-sage"
          : "border-ring bg-well text-transparent hover:border-accent",
      )}
    >
      {done ? "✓" : ""}
    </button>
  );
}

export function ScheduleGrid({ weeks, initialWeekId }: { weeks: WeekWithDetail[]; initialWeekId: string | null }) {
  const [activeWeekId, setActiveWeekId] = useState(initialWeekId ?? weeks[0]?.id ?? "");
  const [localWeeks, setLocalWeeks] = useState(weeks);
  const [, startTransition] = useTransition();

  const week = useMemo(
    () => localWeeks.find((w) => w.id === activeWeekId) ?? null,
    [localWeeks, activeWeekId],
  );

  function handleToggle(dayId: string, key: string) {
    setLocalWeeks((prev) =>
      prev.map((w) => ({
        ...w,
        days: w.days.map((d) => {
          if (d.id !== dayId) return d;
          const current = d.platforms[key];
          if (current === "off") return d;
          return {
            ...d,
            platforms: { ...d.platforms, [key]: current === "done" ? "pending" : "done" },
          };
        }),
      })),
    );
    startTransition(async () => {
      await toggleDayCell(dayId, key);
    });
  }

  function handleNotesBlur(dayId: string, field: "notes_couples" | "notes_planner", value: string) {
    startTransition(async () => {
      await updateDayNotes(dayId, field, value);
    });
  }

  function handlePerfBlur(weekId: string, field: string, value: string) {
    startTransition(async () => {
      await updateWeekPerformance(weekId, { [field]: value });
    });
  }

  if (localWeeks.length === 0) {
    return <p className="text-[13.5px] text-muted">No schedule weeks yet.</p>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {localWeeks.map((w) => {
          const doneCount = w.days.reduce(
            (n, d) => n + Object.values(d.platforms).filter((v) => v === "done").length,
            0,
          );
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setActiveWeekId(w.id)}
              className={cn(
                "rounded-[var(--radius-pill)] border-[1.5px] px-3.5 py-1.5 text-[13px] font-medium",
                w.id === activeWeekId
                  ? "border-ink bg-ink text-surface font-semibold"
                  : "border-hairline bg-surface text-muted hover:border-accent hover:text-accent",
              )}
            >
              {w.label}
              {doneCount > 0 ? (
                <span className="ml-1.5 inline-block size-1.5 rounded-full bg-sage align-middle" />
              ) : null}
            </button>
          );
        })}
      </div>

      {week ? (
        <Card className="px-5 py-5">
          <div className="mb-1 font-serif text-[20px] font-semibold text-ink">{week.label}</div>
          <p className="mb-4 text-[12.5px] text-muted">Tap a box to mark it created &amp; posted</p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="border-b-[1.5px] border-hairline pb-2 text-left text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">
                    Day
                  </th>
                  {SCHEDULE_PLATFORM_COLS.map((c) => (
                    <th
                      key={c.key}
                      className="border-b-[1.5px] border-hairline px-1.5 pb-2 text-center text-[11px] font-semibold tracking-[0.03em] text-muted uppercase"
                    >
                      {c.label}
                    </th>
                  ))}
                  <th className="border-b-[1.5px] border-hairline px-1.5 pb-2 text-left text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">
                    Couples notes
                  </th>
                  <th className="border-b-[1.5px] border-hairline px-1.5 pb-2 text-left text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">
                    Planner+Ops notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {week.days.map((day) => (
                  <tr key={day.id}>
                    <td className="border-b border-hairline py-1.5 pr-2 font-semibold whitespace-nowrap">
                      {formatDayLabel(day.date)}
                    </td>
                    {SCHEDULE_PLATFORM_COLS.map((c) => (
                      <td key={c.key} className="border-b border-hairline px-1.5 py-1.5 text-center">
                        <Cell
                          status={day.platforms[c.key] ?? "pending"}
                          onToggle={() => handleToggle(day.id, c.key)}
                        />
                      </td>
                    ))}
                    <td className="max-w-[160px] border-b border-hairline px-1.5 py-1.5 text-[12px] text-muted">
                      <input
                        defaultValue={day.notes_couples ?? ""}
                        onBlur={(e) => handleNotesBlur(day.id, "notes_couples", e.currentTarget.value)}
                        placeholder="—"
                        className="w-full bg-transparent outline-none placeholder:text-ring"
                      />
                    </td>
                    <td className="max-w-[160px] border-b border-hairline px-1.5 py-1.5 text-[12px] text-muted">
                      <input
                        defaultValue={day.notes_planner ?? ""}
                        onBlur={(e) => handleNotesBlur(day.id, "notes_planner", e.currentTarget.value)}
                        placeholder="—"
                        className="w-full bg-transparent outline-none placeholder:text-ring"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-hairline pt-4 md:grid-cols-4">
            {(
              [
                ["views", "Views"],
                ["follower_growth", "Growth"],
                ["dms", "DMs"],
                ["signups", "Sign-ups"],
              ] as const
            ).map(([field, label]) => (
              <label key={field} className="block">
                <span className="mb-1 block text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">
                  {label}
                </span>
                <input
                  defaultValue={week.performance?.[field] ?? ""}
                  onBlur={(e) => handlePerfBlur(week.id, field, e.currentTarget.value)}
                  placeholder="—"
                  className="w-full rounded-[var(--radius-inner)] border border-ring bg-surface px-2.5 py-1.5 text-[13px]"
                />
              </label>
            ))}
            <div className="col-span-2 md:col-span-4">
              <span className="mb-1 block text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">
                What drove it
              </span>
              <Textarea
                defaultValue={week.performance?.notes ?? ""}
                onBlur={(e) => handlePerfBlur(week.id, "notes", e.currentTarget.value)}
                rows={2}
                className="text-[13px]"
              />
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
