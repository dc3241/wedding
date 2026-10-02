"use client";

import {
  chooseWeekIdea,
  passWeekIdea,
} from "@/app/(admin)/admin/content-week/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import {
  IDEATION_LANES,
  formatDayHeading,
  formatWeekRange,
  LANE_LABEL,
  LANE_QUOTA_HINT,
  linkedInIntent,
  type ContentLane,
  type ContentSlot,
  type IdeaDraft,
} from "@/lib/admin/content-week";
import { topicByKey } from "@/lib/admin/content-topics";
import type { IdeationItem } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  weekStart: string;
  weeks: string[];
  dates: string[];
  today: string;
  ideas: IdeationItem[];
  slots: ContentSlot[];
  drafts: Record<string, IdeaDraft>;
};

export function ContentWeekIdeas({
  weekStart,
  weeks,
  dates,
  today,
  ideas,
  slots,
  drafts,
}: Props) {
  const router = useRouter();
  const [day, setDay] = useState(dates.includes(today) ? today : dates[0]!);
  const [focus, setFocus] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const weekOptions = weeks.includes(weekStart) ? weeks : [weekStart, ...weeks];

  async function generate(body: Record<string, string>) {
    const key = body.lane ? `${body.date}:${body.lane}` : body.date ? body.date : "week";
    setGenerating(key);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/ideation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, focus: focus.trim() || undefined }),
      });
      const data = (await res.json()) as {
        error?: string;
        errors?: string[];
        daysGenerated?: string[];
        daysSkipped?: string[];
      };
      if (!res.ok) {
        setError(data.error ?? "Could not generate ideas.");
        return;
      }
      if (data.errors?.length) setError(data.errors.join(" "));
      else if (data.daysSkipped?.length && !data.daysGenerated?.length) {
        setNotice("This week already has ideas. Use Generate more on a lane to replace a shortlist.");
      } else setNotice("Ideas are ready. Choose the ones to produce.");
      router.refresh();
    } catch {
      setError("Network error reaching the ideation route.");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div>
      <Card className="mb-5 px-5 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[200px]">
            <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              Week
            </span>
            <Select
              aria-label="Week"
              value={weekStart}
              onChange={(e) => router.push(`/admin/ideation?week=${e.target.value}`)}
            >
              {weekOptions.map((start) => (
                <option key={start} value={start}>
                  {formatWeekRange(start)}
                </option>
              ))}
            </Select>
          </label>
          <label className="block min-w-[220px] flex-1">
            <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              Focus (optional)
            </span>
            <Input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Leave blank to follow the topic rotation"
            />
          </label>
          <Button
            variant="primary"
            onClick={() => generate({})}
            disabled={generating !== null}
          >
            {generating === "week" ? "Generating…" : "Generate week"}
          </Button>
        </div>
        <p className="mt-2 text-[13px] text-muted">
          Sunday morning fills Monday–Saturday: 3 tip and 3 promo ideas for slideshows
          and pins, plus 3 LinkedIn ideas for that day’s tip or promo. Videos stay
          on the schedule. Choose what to keep, then Produce.
        </p>
        {error ? <p className="mt-2 text-[13px] text-rosewood">{error}</p> : null}
        {notice ? <p className="mt-2 text-[13px] text-sage">{notice}</p> : null}
      </Card>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {dates.map((date) => {
          const daySlots = slots.filter((slot) => slot.slot_date === date && slot.lane !== "video");
          const filled = daySlots.filter((slot) => slot.idea_id).length;
          const total = daySlots.length;
          const active = date === day;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setDay(date)}
              className={cn(
                "shrink-0 rounded-[var(--radius-pill)] border-[1.5px] px-3.5 py-1.5 text-[14px] font-medium",
                active
                  ? "border-ink bg-ink text-surface font-semibold"
                  : "border-hairline bg-surface text-muted hover:border-accent hover:text-accent",
              )}
            >
              {formatDayHeading(date).split(",")[0]}
              <span className={cn("ml-1.5 tabular-nums", active ? "text-surface" : "text-muted")}>
                {filled}/{total}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">
          {formatDayHeading(day)}
        </h2>
        <Button
          variant="default"
          onClick={() => generate({ date: day })}
          disabled={generating !== null}
        >
          {generating === day ? "Generating…" : "Generate this day"}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {IDEATION_LANES.map((lane) => (
          <LaneBlock
            key={lane}
            lane={lane}
            day={day}
            ideas={ideas.filter(
              (idea) => idea.slot_date === day && idea.lane === lane && idea.rating !== "down",
            )}
            slots={slots.filter((slot) => slot.slot_date === day && slot.lane === lane)}
            drafts={drafts}
            generating={generating === `${day}:${lane}`}
            locked={generating !== null}
            onMore={() => generate({ date: day, lane })}
          />
        ))}
      </div>
    </div>
  );
}

function LaneBlock({
  lane,
  day,
  ideas,
  slots,
  drafts,
  generating,
  locked,
  onMore,
}: {
  lane: ContentLane;
  day: string;
  ideas: IdeationItem[];
  slots: ContentSlot[];
  drafts: Record<string, IdeaDraft>;
  generating: boolean;
  locked: boolean;
  onMore: () => void;
}) {
  const linkedinIntent = lane === "linkedin" ? linkedInIntent(day) : null;
  const groups: Array<"tip" | "promo"> =
    linkedinIntent === "promo" ? ["promo"] : linkedinIntent === "tip" ? ["tip"] : ["tip", "promo"];

  return (
    <Card className="px-5 py-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">{LANE_LABEL[lane]}</h3>
          <p className="text-[13px] text-muted">{LANE_QUOTA_HINT[lane]}</p>
        </div>
        <Button variant="default" onClick={onMore} disabled={locked}>
          {generating ? "Generating…" : "Generate more"}
        </Button>
      </div>
      <div className={cn("grid gap-4", groups.length > 1 && "md:grid-cols-2")}>
        {groups.map((intent) => {
          const group = ideas.filter((idea) => idea.intent === intent);
          const topic = topicByKey(group[0]?.topic_key);
          const taken = slots.filter((slot) => slot.idea_id && slot.intent === intent).length;
          const cap = slots.filter((slot) => slot.intent === intent).length;
          return (
            <div key={intent}>
              <div className="mb-2 flex items-center gap-2">
                <Pill variant={intent === "promo" ? "accent" : "sage"}>
                  {intent === "promo" ? "Promo" : "Tip"}
                </Pill>
                <span className="text-[13px] text-muted tabular-nums">
                  {taken}/{cap} chosen
                </span>
              </div>
              {topic ? <p className="mb-2 text-[13px] text-muted">{topic.label}</p> : null}
              {group.length === 0 ? (
                <p className="rounded-[var(--radius-inner)] bg-well px-3 py-3 text-[14px] text-muted shadow-recessed">
                  No ideas yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {group.map((idea) => (
                    <IdeaRow key={idea.id} idea={idea} draft={drafts[idea.id]} chosen={slots.some((slot) => slot.idea_id === idea.id)} />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function IdeaRow({
  idea,
  draft,
  chosen,
}: {
  idea: IdeationItem;
  draft?: IdeaDraft;
  chosen: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [producing, setProducing] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update this idea.");
      }
    });
  }

  async function produce() {
    setProducing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ideation/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: idea.id }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not produce this idea.");
        return;
      }
      window.location.assign("/admin/content-queue");
    } catch {
      setError("Network error reaching the produce route.");
    } finally {
      setProducing(false);
    }
  }

  return (
    <li className="rounded-[var(--radius-inner)] bg-well px-3 py-3 shadow-recessed">
      <p className="text-[15px] font-medium text-ink">{idea.idea_text}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant={chosen ? "primary" : "default"}
          className="px-3 py-1.5"
          disabled={pending || Boolean(idea.used_at)}
          onClick={() => run(() => chooseWeekIdea(idea.id))}
        >
          {chosen ? "Chosen" : "Choose"}
        </Button>
        {!idea.used_at ? (
          <Button
            variant="default"
            className="px-3 py-1.5"
            disabled={pending}
            onClick={() => run(() => passWeekIdea(idea.id))}
          >
            Pass
          </Button>
        ) : null}
        {chosen && !idea.used_at ? (
          <Button variant="primary" className="px-3 py-1.5" disabled={producing || pending} onClick={produce}>
            {producing ? "Producing…" : "Produce"}
          </Button>
        ) : null}
        {idea.used_at ? (
          <Link href="/admin/content-queue" className="self-center text-[13px] font-semibold text-accent">
            {draft?.ready ? "Draft ready" : draft?.pending ? "Generating…" : "In the queue"}
          </Link>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-[13px] text-rosewood">{error}</p> : null}
    </li>
  );
}
