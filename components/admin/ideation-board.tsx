"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import {
  applyIdeaTargetPatch,
  AUDIENCE_OPTIONS,
  DEFAULT_CAROUSEL_SLIDES,
  formatsForPlatform,
  IDEATION_GENERATE_COUNT,
  isIdeaFridayReady,
  MAX_CAROUSEL_SLIDES,
  MIN_CAROUSEL_SLIDES,
  type ContentPostFormat,
} from "@/lib/admin/content-formats";
import {
  CONTENT_QUEUE_PLATFORMS,
  type ContentQueuePlatform,
} from "@/lib/admin/content-queue";
import type { AudienceGroup } from "@/lib/admin/platform-audience";
import type { IdeationItem } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { useState, useTransition } from "react";
import {
  deleteIdea,
  rateIdea,
  setIdeaComment,
  setIdeaTarget,
} from "@/app/(admin)/admin/ideation/actions";

type Filter = "all" | "up" | "down" | "unrated";

function ThumbButton({
  active,
  onClick,
  variant,
  children,
}: {
  active: boolean;
  onClick: () => void;
  variant: "up" | "down";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-[var(--radius-pill)] border-[1.5px] text-[15px] transition-colors",
        active
          ? variant === "up"
            ? "border-sage bg-sage-wash text-sage"
            : "border-rosewood bg-rosewood-wash text-rosewood"
          : "border-hairline bg-surface text-muted hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}

function fridayHint(item: IdeationItem): string | null {
  if (item.rating !== "up") return null;
  if (!item.platform) return "Pick a platform so Friday can produce this.";
  if (!item.format) return "Pick a format so Friday knows what to make.";
  if (!item.audience_group) return "Pick an audience so this files in the right bank.";
  return null;
}

function IdeaCard({
  item,
  onPatch,
  onRemove,
}: {
  item: IdeationItem;
  onPatch: (id: string, patch: Partial<IdeationItem>) => void;
  onRemove: (id: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState(item.comment ?? "");
  const [error, setError] = useState<string | null>(null);
  const formatOptions = item.platform ? formatsForPlatform(item.platform) : [];
  const hint = fridayHint(item);

  function handleRate(rating: "up" | "down") {
    const previous = item.rating;
    const next = previous === rating ? null : rating;
    setError(null);
    onPatch(item.id, { rating: next });
    startTransition(async () => {
      try {
        await rateIdea(item.id, next);
      } catch (err) {
        onPatch(item.id, { rating: previous });
        setError(err instanceof Error ? err.message : "Could not save rating.");
      }
    });
  }

  function handleCommentBlur() {
    const previous = item.comment;
    const next = comment.trim() || null;
    setError(null);
    onPatch(item.id, { comment: next });
    startTransition(async () => {
      try {
        await setIdeaComment(item.id, next);
      } catch (err) {
        onPatch(item.id, { comment: previous });
        setError(err instanceof Error ? err.message : "Could not save note.");
      }
    });
  }

  function handleTarget(patch: Parameters<typeof applyIdeaTargetPatch>[1]) {
    const previous = {
      platform: item.platform,
      format: item.format,
      audience_group: item.audience_group,
      carousel_slides: item.carousel_slides,
    };
    const next = applyIdeaTargetPatch(previous, patch);
    setError(null);
    onPatch(item.id, next);
    startTransition(async () => {
      try {
        await setIdeaTarget(item.id, patch);
      } catch (err) {
        onPatch(item.id, previous);
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteIdea(item.id);
        onRemove(item.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete.");
      }
    });
  }

  return (
    <Card className="px-5 py-4">
      <p className="mb-3 text-[15px] font-medium text-ink">{item.idea_text}</p>
      <div className="mb-2 flex items-center gap-2">
        <ThumbButton active={item.rating === "up"} onClick={() => handleRate("up")} variant="up">
          👍
        </ThumbButton>
        <ThumbButton
          active={item.rating === "down"}
          onClick={() => handleRate("down")}
          variant="down"
        >
          👎
        </ThumbButton>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="ml-auto text-[13px] font-medium text-rosewood hover:underline"
        >
          Delete
        </button>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <label>
          <span className="sr-only">Platform</span>
          <Select
            value={item.platform ?? ""}
            onChange={(e) =>
              handleTarget({
                platform: (e.target.value || null) as ContentQueuePlatform | null,
              })
            }
            aria-label="Platform"
            className="py-1.5"
          >
            <option value="">Platform</option>
            {CONTENT_QUEUE_PLATFORMS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="sr-only">Format</span>
          <Select
            value={item.format ?? ""}
            onChange={(e) =>
              handleTarget({
                format: (e.target.value || null) as ContentPostFormat | null,
              })
            }
            aria-label="Format"
            className="py-1.5"
            disabled={!item.platform}
          >
            <option value="">Format</option>
            {formatOptions.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="sr-only">Audience</span>
          <Select
            value={item.audience_group ?? ""}
            onChange={(e) =>
              handleTarget({
                audience_group: (e.target.value || null) as AudienceGroup | null,
              })
            }
            aria-label="Audience"
            className="py-1.5"
            disabled={item.platform === "linkedin"}
          >
            <option value="">Audience</option>
            {AUDIENCE_OPTIONS.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </Select>
        </label>
        {item.format === "carousel" ? (
          <label>
            <span className="sr-only">Slide count</span>
            <Select
              value={String(item.carousel_slides ?? DEFAULT_CAROUSEL_SLIDES)}
              onChange={(e) =>
                handleTarget({ carousel_slides: Number(e.target.value) })
              }
              aria-label="Slide count"
              className="py-1.5"
            >
              {Array.from(
                { length: MAX_CAROUSEL_SLIDES - MIN_CAROUSEL_SLIDES + 1 },
                (_, i) => MIN_CAROUSEL_SLIDES + i,
              ).map((n) => (
                <option key={n} value={n}>
                  {n} slides
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>
      <Input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onBlur={handleCommentBlur}
        placeholder="Why? (feeds future generations)"
      />
      {hint ? <p className="mt-2 text-[13px] text-muted">{hint}</p> : null}
      {error ? <p className="mt-2 text-[13px] text-rosewood">{error}</p> : null}
    </Card>
  );
}

export function IdeationBoard({ items }: { items: IdeationItem[] }) {
  const [localItems, setLocalItems] = useState(items);
  const [filter, setFilter] = useState<Filter>("all");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  function patchItem(id: string, patch: Partial<IdeationItem>) {
    setLocalItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeItem(id: string) {
    setLocalItems((prev) => prev.filter((i) => i.id !== id));
  }

  const fridayReady = localItems.filter(isIdeaFridayReady).length;

  const filtered = localItems.filter((i) => {
    if (filter === "all") return true;
    if (filter === "unrated") return i.rating == null;
    return i.rating === filter;
  });

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/admin/ideation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          count: IDEATION_GENERATE_COUNT,
        }),
      });
      const data = (await res.json()) as { items?: IdeationItem[]; error?: string };
      if (!res.ok || !data.items) {
        setGenError(data.error ?? "Could not generate ideas.");
        return;
      }
      setLocalItems((prev) => [...data.items!, ...prev]);
    } catch {
      setGenError("Network error reaching the ideation route.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <Card className="mb-5 px-5 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              Topic (optional)
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. budget tips, day-of timeline, vendor red flags"
            />
          </div>
          <Button variant="primary" onClick={handleGenerate} disabled={generating}>
            {generating ? "Generating…" : "✨ Generate ideas"}
          </Button>
        </div>
        {genError ? <p className="mt-2 text-[13px] text-rosewood">{genError}</p> : null}
        <p className="mt-2 text-[13px] text-muted">
          Liked ideas with a platform, format, and audience become Friday&apos;s
          content-queue batch (up to 12). Generate {IDEATION_GENERATE_COUNT} so
          you can pass a few and still like 9–12. Passed ideas steer the next
          generate away. Produced likes leave this list.
          {fridayReady > 0 ? ` ${fridayReady} ready for Friday.` : ""}
        </p>
      </Card>

      <div className="mb-4 flex gap-2">
        {(["all", "up", "down", "unrated"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-[var(--radius-pill)] border-[1.5px] px-3.5 py-1.5 text-[14px] font-medium",
              filter === f
                ? "border-ink bg-ink text-surface font-semibold"
                : "border-hairline bg-surface text-muted hover:border-accent hover:text-accent",
            )}
          >
            {f === "all"
              ? "All"
              : f === "up"
                ? "👍 Liked"
                : f === "down"
                  ? "👎 Passed"
                  : "Unrated"}
            {f !== "all" ? (
              <Pill variant="default" className="ml-1.5 px-1.5 py-0">
                {
                  localItems.filter((i) =>
                    f === "unrated" ? i.rating == null : i.rating === f,
                  ).length
                }
              </Pill>
            ) : null}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState>No ideas here yet — generate some above.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <IdeaCard
              key={item.id}
              item={item}
              onPatch={patchItem}
              onRemove={removeItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
