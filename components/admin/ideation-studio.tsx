"use client";

import { ContentQueueBoard } from "@/components/admin/content-queue-board";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_CAROUSEL_SLIDES,
  MAX_CAROUSEL_SLIDES,
  MIN_CAROUSEL_SLIDES,
  formatNeedsImages,
  formatsForPlatform,
  type ContentPostFormat,
} from "@/lib/admin/content-formats";
import {
  CONTENT_QUEUE_PLATFORMS,
  type ContentQueuePlatform,
} from "@/lib/admin/content-queue";
import { PRODUCT_SHOTS } from "@/lib/admin/content-queue/product-shots";
import { POST_STYLES, POST_STYLE_META, type PostStyle } from "@/lib/admin/content-styles";
import type { ContentQueueItem } from "@/lib/admin/types";
import { lockedAudienceForPlatform } from "@/lib/admin/platform-audience";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function defaultFormat(platform: ContentQueuePlatform): ContentPostFormat {
  if (platform === "tiktok") return "carousel";
  if (platform === "pinterest") return "pin";
  return "static";
}

function shotLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function IdeationStudio({ items }: { items: ContentQueueItem[] }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<ContentQueuePlatform>("tiktok");
  const [format, setFormat] = useState<ContentPostFormat>("carousel");
  const [postStyle, setPostStyle] = useState<PostStyle>("save_this");
  const [surface, setSurface] = useState("");
  const [slides, setSlides] = useState(DEFAULT_CAROUSEL_SLIDES);
  const [instructions, setInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const formatOptions = useMemo(() => formatsForPlatform(platform), [platform]);
  const audience = lockedAudienceForPlatform(platform);

  function handlePlatform(next: ContentQueuePlatform) {
    setPlatform(next);
    const allowed = formatsForPlatform(next);
    const preferred = defaultFormat(next);
    setFormat(allowed.some((option) => option.key === preferred) ? preferred : allowed[0]!.key);
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/ideation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          format,
          postStyle,
          surface: surface || undefined,
          instructions: instructions.trim() || undefined,
          carousel_slides: format === "carousel" ? slides : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; queueId?: string; ok?: boolean };
      if (!data.queueId) {
        setError(data.error ?? "Could not generate this post.");
        return;
      }
      if (data.ok === false) {
        setError(data.error ?? "Caption landed, but the image failed.");
      } else {
        setNotice("Post is ready to review below.");
        setInstructions("");
      }
      router.refresh();
    } catch {
      setError("Network error reaching the generate route.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <Card className="mb-5 px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              Platform
            </span>
            <Select
              aria-label="Platform"
              value={platform}
              onChange={(e) => handlePlatform(e.target.value as ContentQueuePlatform)}
            >
              {CONTENT_QUEUE_PLATFORMS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              Angle
            </span>
            <Select
              aria-label="Angle"
              value={postStyle}
              onChange={(e) => setPostStyle(e.target.value as PostStyle)}
            >
              {POST_STYLES.map((key) => (
                <option key={key} value={key}>
                  {POST_STYLE_META[key].label}
                </option>
              ))}
            </Select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              Post type
            </span>
            <Select
              aria-label="Post type"
              value={format}
              onChange={(e) => setFormat(e.target.value as ContentPostFormat)}
            >
              {formatOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          {format === "carousel" ? (
            <label className="block">
              <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
                Slides
              </span>
              <Select
                aria-label="Slide count"
                value={String(slides)}
                onChange={(e) => setSlides(Number(e.target.value))}
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
          <label className="block">
            <span className="mb-1 flex items-center justify-between gap-2 text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              Product screen
              <Link
                href="/admin/product-shots"
                className="text-[13px] font-medium tracking-normal text-accent normal-case hover:underline"
              >
                Manage
              </Link>
            </span>
            <Select
              aria-label="Product screen"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
            >
              <option value="">None</option>
              {PRODUCT_SHOTS.map((shot) => (
                <option key={shot.slug} value={shot.slug}>
                  {shotLabel(shot.slug)}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
            Instructions
          </span>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder="Optional. Topic, hook, who it's for, what the image should show…"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={generate} disabled={generating}>
            {generating ? "Generating…" : "Generate post"}
          </Button>
          <p className="text-[13px] text-muted">
            {audience === "planner"
              ? "Speaks to venues and planners."
              : "Speaks to couples."}{" "}
            {formatNeedsImages(format)
              ? "Caption and image generate together."
              : "Caption generates now — this post type has no graphic."}{" "}
            Approve below to file it in the bank.
          </p>
        </div>
        {error ? <p className="mt-2 text-[13px] text-rosewood">{error}</p> : null}
        {notice ? <p className="mt-2 text-[13px] text-sage">{notice}</p> : null}
      </Card>

      <h2 className="mb-3 text-[19px] font-extrabold tracking-[-0.02em] text-ink">Review</h2>
      <ContentQueueBoard items={items} emptyLabel="No posts waiting. Generate one above." />
    </div>
  );
}
