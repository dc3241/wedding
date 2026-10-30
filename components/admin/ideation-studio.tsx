"use client";

import { setIdeaTarget } from "@/app/(admin)/admin/ideation/actions";
import { ContentQueueBoard } from "@/components/admin/content-queue-board";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_CAROUSEL_SLIDES,
  formatNeedsImages,
  formatsForPlatform,
  MAX_CAROUSEL_SLIDES,
  MIN_CAROUSEL_SLIDES,
  type ContentPostFormat,
} from "@/lib/admin/content-formats";
import {
  CONTENT_QUEUE_PLATFORMS,
  type ContentQueuePlatform,
} from "@/lib/admin/content-queue";
import { postStyleLabel } from "@/lib/admin/content-styles";
import { lockedAudienceForPlatform } from "@/lib/admin/platform-audience";
import type { ContentQueueItem, IdeationItem } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SIGNAL_KEY = "ideation-signal";
const PLATFORM_KEY = "ideation-platform";

const SIGNAL_PLACEHOLDER =
  "What's working? Paste hooks, posts, or numbers, and say what you want more of.\n\n" +
  'Example: My best post opened with a cover slide that said "First month engaged? Here\'s what actually can\'t wait." ' +
  "It names who it's for and makes them wonder what they're missing. I want more posts in that format, on any topic.";

type CreateState = "idle" | "queued" | "creating" | "done" | "error";

type IdeaView = {
  id: string;
  hook: string;
  note: string | null;
  platform: ContentQueuePlatform;
  format: ContentPostFormat;
  slides: number;
  styleLabel: string;
  state: CreateState;
  error: string | null;
};

type BatchIdeaResponse = {
  id: string;
  idea_text: string;
  comment: string | null;
  platform: ContentQueuePlatform;
  format: ContentPostFormat;
  carousel_slides: number | null;
  post_style: IdeationItem["post_style"];
};

function toView(item: {
  id: string;
  idea_text: string;
  comment: string | null;
  platform: ContentQueuePlatform | null;
  format: ContentPostFormat | null;
  carousel_slides: number | null;
  post_style: IdeationItem["post_style"];
}): IdeaView | null {
  if (!item.platform || !item.format) return null;
  return {
    id: item.id,
    hook: item.idea_text,
    note: item.comment?.trim() || null,
    platform: item.platform,
    format: item.format,
    slides: item.carousel_slides ?? DEFAULT_CAROUSEL_SLIDES,
    styleLabel: postStyleLabel(item.post_style),
    state: "idle",
    error: null,
  };
}

function imageFormats(platform: ContentQueuePlatform) {
  return formatsForPlatform(platform).filter((f) => formatNeedsImages(f.key));
}

function readSaved(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeSaved(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the box just won't remember */
  }
}

export function IdeationStudio({
  items,
  ideas: initialIdeas,
}: {
  items: ContentQueueItem[];
  ideas: IdeationItem[];
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<ContentQueuePlatform>("tiktok");
  const [signal, setSignal] = useState("");
  const [ideas, setIdeas] = useState<IdeaView[]>(() =>
    initialIdeas.flatMap((item) => {
      const view = toView(item);
      return view ? [view] : [];
    }),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore the notes and platform after hydration (this browser only).
  // Reading localStorage during render would mismatch the server HTML.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSignal(readSaved(SIGNAL_KEY));
    const savedPlatform = readSaved(PLATFORM_KEY);
    if (CONTENT_QUEUE_PLATFORMS.some((p) => p.key === savedPlatform)) {
      setPlatform(savedPlatform as ContentQueuePlatform);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const audience = lockedAudienceForPlatform(platform);

  function patchIdea(id: string, patch: Partial<IdeaView>) {
    setIdeas((current) => current.map((idea) => (idea.id === id ? { ...idea, ...patch } : idea)));
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ideation/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, signal }),
      });
      const data = (await res.json()) as { error?: string; ideas?: BatchIdeaResponse[] };
      if (!res.ok || !data.ideas) {
        setError(data.error ?? "Could not generate ideas.");
        return;
      }
      setIdeas(
        data.ideas.flatMap((item) => {
          const view = toView({ ...item });
          return view ? [view] : [];
        }),
      );
      setSelected(new Set());
    } catch {
      setError("Network error reaching the idea generator.");
    } finally {
      setGenerating(false);
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveTarget(
    idea: IdeaView,
    patch: { format?: ContentPostFormat; carousel_slides?: number },
  ) {
    const previous = { format: idea.format, slides: idea.slides };
    patchIdea(idea.id, {
      ...(patch.format ? { format: patch.format } : {}),
      ...(patch.carousel_slides ? { slides: patch.carousel_slides } : {}),
    });
    try {
      await setIdeaTarget(idea.id, patch);
    } catch (err) {
      patchIdea(idea.id, { format: previous.format, slides: previous.slides });
      patchIdea(idea.id, { error: err instanceof Error ? err.message : "Could not save." });
    }
  }

  /** One at a time: each post is a model call plus image renders. */
  async function createSelected() {
    const queue = ideas.filter(
      (idea) => selected.has(idea.id) && (idea.state === "idle" || idea.state === "error"),
    );
    if (queue.length === 0) return;
    setCreating(true);
    setError(null);
    for (const idea of queue) patchIdea(idea.id, { state: "queued", error: null });

    for (const idea of queue) {
      patchIdea(idea.id, { state: "creating" });
      try {
        const res = await fetch("/api/admin/ideation/produce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: idea.id }),
        });
        const data = (await res.json()) as { error?: string; queueId?: string; ok?: boolean };
        if (!data.queueId) {
          patchIdea(idea.id, { state: "error", error: data.error ?? "Could not create this post." });
        } else {
          patchIdea(idea.id, {
            state: "done",
            error: data.ok === false ? (data.error ?? "Created, but the image failed.") : null,
          });
          setSelected((current) => {
            const next = new Set(current);
            next.delete(idea.id);
            return next;
          });
        }
      } catch {
        patchIdea(idea.id, { state: "error", error: "Network error reaching the create route." });
      }
      router.refresh();
    }
    setCreating(false);
  }

  const pickedCount = ideas.filter(
    (idea) => selected.has(idea.id) && (idea.state === "idle" || idea.state === "error"),
  ).length;

  return (
    <div>
      <Card className="mb-5 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_1fr]">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              Platform
            </span>
            <Select
              aria-label="Platform"
              value={platform}
              onChange={(e) => {
                const next = e.target.value as ContentQueuePlatform;
                setPlatform(next);
                writeSaved(PLATFORM_KEY, next);
              }}
            >
              {CONTENT_QUEUE_PLATFORMS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </Select>
            <span className="mt-1 block text-[13px] text-muted">
              {audience === "planner" ? "Speaks to venues and planners." : "Speaks to couples."}
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              What&apos;s working
            </span>
            <Textarea
              value={signal}
              onChange={(e) => {
                setSignal(e.target.value);
                writeSaved(SIGNAL_KEY, e.target.value);
              }}
              rows={7}
              placeholder={SIGNAL_PLACEHOLDER}
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={generate} disabled={generating || creating}>
            {generating ? "Generating ideas…" : "Generate 10 ideas"}
          </Button>
          <p className="text-[13px] text-muted">
            It copies the format of what&apos;s winning, not the wording, and skips hooks you&apos;ve
            already shown.
          </p>
        </div>
        {error ? <p className="mt-2 text-[13px] text-rosewood">{error}</p> : null}
      </Card>

      {ideas.length > 0 ? (
        <section className="mb-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ink">Ideas</h2>
            <Button
              variant="primary"
              onClick={createSelected}
              disabled={creating || generating || pickedCount === 0}
              className="px-4 py-2"
            >
              {creating
                ? "Creating…"
                : pickedCount > 0
                  ? `Create ${pickedCount} selected`
                  : "Create selected"}
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {ideas.map((idea) => {
              const locked = idea.state === "queued" || idea.state === "creating" || idea.state === "done";
              const formats = imageFormats(idea.platform);
              return (
                <Card
                  key={idea.id}
                  className={cn(
                    "px-4 py-3",
                    selected.has(idea.id) && !locked ? "ring-2 ring-accent" : "",
                    idea.state === "done" ? "opacity-70" : "",
                  )}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-[var(--color-accent)]"
                      checked={selected.has(idea.id)}
                      disabled={locked || creating}
                      onChange={() => toggle(idea.id)}
                      aria-label="Select this idea"
                    />
                    <span className="block">
                      <span className="block text-[15px] font-medium text-ink">{idea.hook}</span>
                      {idea.note ? (
                        <span className="mt-1 block text-[13px] text-muted">{idea.note}</span>
                      ) : null}
                    </span>
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Pill variant="accent">{idea.styleLabel}</Pill>
                    <Select
                      aria-label="Format"
                      value={idea.format}
                      disabled={locked || creating || formats.length < 2}
                      onChange={(e) => void saveTarget(idea, { format: e.target.value as ContentPostFormat })}
                      className="w-auto"
                    >
                      {formats.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    {idea.format === "carousel" ? (
                      <Select
                        aria-label="Slide count"
                        value={String(idea.slides)}
                        disabled={locked || creating}
                        onChange={(e) => void saveTarget(idea, { carousel_slides: Number(e.target.value) })}
                        className="w-auto"
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
                    ) : null}
                    {idea.state === "queued" ? <Pill variant="default">Queued</Pill> : null}
                    {idea.state === "creating" ? <Pill variant="clay">Creating…</Pill> : null}
                    {idea.state === "done" ? <Pill variant="sage">In review below</Pill> : null}
                  </div>
                  {idea.error ? <p className="mt-2 text-[13px] text-rosewood">{idea.error}</p> : null}
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      <h2 className="mb-3 text-[19px] font-extrabold tracking-[-0.02em] text-ink">Review</h2>
      <ContentQueueBoard
        items={items}
        emptyLabel="Nothing to review yet. Pick ideas above and click Create."
      />
    </div>
  );
}
