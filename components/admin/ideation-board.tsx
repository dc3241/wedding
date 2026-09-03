"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import type { IdeationItem } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { useState, useTransition } from "react";
import { deleteIdea, rateIdea, setIdeaComment } from "@/app/(admin)/admin/ideation/actions";

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

function IdeaCard({ item }: { item: IdeationItem }) {
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState(item.comment ?? "");

  function handleRate(rating: "up" | "down") {
    const next = item.rating === rating ? null : rating;
    startTransition(async () => {
      await rateIdea(item.id, next);
    });
  }

  function handleCommentBlur() {
    startTransition(async () => {
      await setIdeaComment(item.id, comment.trim() || null);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteIdea(item.id);
    });
  }

  return (
    <Card className="px-5 py-4">
      <p className="mb-3 text-[14.5px] text-ink">{item.idea_text}</p>
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
          className="ml-auto text-[12px] font-medium text-rosewood hover:underline"
        >
          Delete
        </button>
      </div>
      <Input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onBlur={handleCommentBlur}
        placeholder="Why? (feeds future generations)"
        className="text-[13px]"
      />
    </Card>
  );
}

export function IdeationBoard({ items }: { items: IdeationItem[] }) {
  const [localItems, setLocalItems] = useState(items);
  const [filter, setFilter] = useState<Filter>("all");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const filtered = localItems.filter((i) => {
    if (filter === "all") return true;
    if (filter === "unrated") return i.rating === null;
    return i.rating === filter;
  });

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/admin/ideation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() || undefined, count: 8 }),
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
            <label className="mb-1 block text-[11px] font-semibold tracking-[0.03em] text-muted uppercase">
              Topic (optional)
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. budget tips, day-of timeline, vendor red flags"
            />
          </div>
          <Button variant="primary" onClick={handleGenerate} disabled={generating} className="text-[13px]">
            {generating ? "Generating…" : "✨ Generate ideas"}
          </Button>
        </div>
        {genError ? <p className="mt-2 text-[12.5px] text-rosewood">{genError}</p> : null}
        <p className="mt-2 text-[12px] text-muted">
          Pulls your best- and worst-rated past ideas as context before generating.
        </p>
      </Card>

      <div className="mb-4 flex gap-2">
        {(["all", "up", "down", "unrated"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-[var(--radius-pill)] border-[1.5px] px-3.5 py-1.5 text-[13px] font-medium",
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
              <Pill variant="default" className="ml-1.5 px-1.5 py-0 text-[10px]">
                {
                  localItems.filter((i) =>
                    f === "unrated" ? i.rating === null : i.rating === f,
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
            <IdeaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
