"use client";

import {
  approveContentQueueItem,
  denyContentQueueItem,
  getContentQueueDownloadUrl,
  regenerateContentQueueItem,
  revertContentQueueItem,
} from "@/app/(admin)/admin/content-queue/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill, type PillVariant } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AUDIENCE_OPTIONS,
  filledImagePaths,
  formatLabel,
  formatNeedsImages,
  imagesReadyForQueue,
  queueNoImageCopy,
  slideCountFor,
} from "@/lib/admin/content-formats";
import {
  CONTENT_QUEUE_PLATFORMS,
  CONTENT_QUEUE_STATUSES,
  contentQueuePlatformMeta,
  type ContentQueuePlatform,
  type ContentQueueStatus,
} from "@/lib/admin/content-queue";
import { CONTENT_TYPE_META } from "@/lib/admin/platforms";
import type { ContentQueueItem } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const STATUS_PILL: Record<ContentQueueStatus, { label: string; pill: PillVariant }> = {
  pending: { label: "Pending", pill: "clay" },
  approved: { label: "Approved", pill: "sage" },
  denied: { label: "Denied", pill: "rosewood" },
};

type PlatformFilter = "all" | ContentQueuePlatform;
type StatusFilter = "all" | ContentQueueStatus;

const IMAGE_POLL_MS = 5000;
const STILL_GENERATING_AFTER_MS = 3 * 60 * 1000;

function imageJobStarted(item: ContentQueueItem): boolean {
  return item.kie_task_ids.length > 0 || Boolean(item.kie_task_id);
}

function generatingCopy(item: ContentQueueItem): string {
  const expected = slideCountFor(item.format, item.carousel_slides);
  const filled = filledImagePaths(item.image_paths).length;
  const startedAt = Date.parse(item.updated_at);
  const takingLong =
    Number.isFinite(startedAt) && Date.now() - startedAt >= STILL_GENERATING_AFTER_MS;
  if (expected > 1) {
    const progress = `${filled} of ${expected}`;
    return takingLong
      ? `Still generating… ${progress}`
      : `Generating images… ${progress}`;
  }
  return takingLong ? "Still generating…" : "Generating image…";
}

function KieSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border-2 border-accent border-t-transparent animate-spin motion-reduce:animate-none",
        className,
      )}
      aria-hidden
    />
  );
}

function QueueImage({
  urls,
  platform,
  format,
  index,
  onIndexChange,
  generating,
  waitingLabel,
}: {
  urls: string[];
  platform: ContentQueuePlatform;
  format: ContentQueueItem["format"];
  index: number;
  onIndexChange: (next: number) => void;
  generating: boolean;
  waitingLabel: string;
}) {
  const aspect = contentQueuePlatformMeta(platform).aspectClass;
  const count = urls.length;

  if (count === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-[var(--radius-inner)] bg-well shadow-recessed",
          aspect,
        )}
        aria-busy={generating}
        aria-live="polite"
      >
        {formatNeedsImages(format) && generating ? (
          <div className="flex flex-col items-center gap-2 px-3">
            <KieSpinner className="size-5" />
            <p className="text-center text-[13px] text-muted">{waitingLabel}</p>
          </div>
        ) : (
          <p className="px-3 text-center text-[13px] text-muted">
            {formatNeedsImages(format) ? waitingLabel : queueNoImageCopy(format)}
          </p>
        )}
      </div>
    );
  }

  const safeIndex = Math.min(index, count - 1);
  const url = urls[safeIndex];

  return (
    <div
      className={cn("relative overflow-hidden rounded-[var(--radius-inner)] bg-well shadow-recessed", aspect)}
      aria-busy={generating}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
      <img src={url} alt="" className="size-full object-cover" />
      {generating ? (
        <div className="absolute top-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-[var(--radius-pill)] bg-surface/90 px-2.5 py-1">
          <KieSpinner className="size-3" />
          <p className="text-[13px] text-muted whitespace-nowrap">{waitingLabel}</p>
        </div>
      ) : null}
      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => onIndexChange((safeIndex - 1 + count) % count)}
            className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-surface/90 text-[15px] font-semibold text-ink"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => onIndexChange((safeIndex + 1) % count)}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-pill)] bg-surface/90 text-[15px] font-semibold text-ink"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Image ${i + 1}`}
                aria-current={i === safeIndex}
                onClick={() => onIndexChange(i)}
                className={cn(
                  "size-1.5 rounded-[var(--radius-pill)]",
                  i === safeIndex ? "bg-accent" : "bg-surface/80",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function QueueCard({ item }: { item: ContentQueueItem }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [promptDraft, setPromptDraft] = useState(item.prompt);
  const [imageIndex, setImageIndex] = useState(0);
  const [retryingImage, setRetryingImage] = useState(false);
  const router = useRouter();
  const platform = contentQueuePlatformMeta(item.platform);
  const statusMeta = STATUS_PILL[item.status];
  const typeMeta = CONTENT_TYPE_META[item.content_type];
  const audienceLabel =
    AUDIENCE_OPTIONS.find((a) => a.key === item.audience_group)?.label ?? null;
  const imagesReady = imagesReadyForQueue(item);
  const jobStarted = imageJobStarted(item);
  const generating =
    formatNeedsImages(item.format) && !imagesReady && (jobStarted || retryingImage);
  const canRetryImage =
    item.status === "pending" && formatNeedsImages(item.format) && !imagesReady;

  useEffect(() => {
    setPromptDraft(item.prompt);
  }, [item.prompt]);

  useEffect(() => {
    if (jobStarted) setRetryingImage(false);
  }, [jobStarted]);

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  function handleCopyCaption() {
    if (!item.caption) return;
    void navigator.clipboard.writeText(item.caption).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleDownload() {
    run(async () => {
      const url = await getContentQueueDownloadUrl(item.id, imageIndex);
      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <Card className="flex flex-col px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Pill variant="default">{platform.label}</Pill>
        {item.format ? <Pill variant="default">{formatLabel(item.format)}</Pill> : null}
        {audienceLabel ? <Pill variant="default">{audienceLabel}</Pill> : null}
        <Pill variant={typeMeta.pill} title={typeMeta.label}>
          {item.content_type}
        </Pill>
        <Pill variant={statusMeta.pill}>{statusMeta.label}</Pill>
      </div>

      <QueueImage
        urls={item.image_urls}
        platform={item.platform}
        format={item.format}
        index={imageIndex}
        onIndexChange={setImageIndex}
        generating={generating}
        waitingLabel={
          generating
            ? jobStarted
              ? generatingCopy(item)
              : "Starting generation…"
            : formatNeedsImages(item.format)
              ? "Image generation didn't start"
              : queueNoImageCopy(item.format)
        }
      />

      <div className="mt-3">
        <Pill variant="default">{item.pillar}</Pill>
      </div>

      {item.caption ? (
        <div className="mt-2">
          <p className="line-clamp-3 text-[15px] font-medium text-ink">{item.caption}</p>
          <button
            type="button"
            onClick={handleCopyCaption}
            className="mt-1 text-[13px] font-medium text-accent hover:underline"
          >
            {copied ? "Copied" : "Copy caption"}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-muted">No caption yet.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {item.status === "pending" ? (
          <>
            <Button
              variant="primary"
              disabled={isPending || !imagesReady}
              onClick={() => run(() => approveContentQueueItem(item.id))}
              className="px-4 py-2"
            >
              Approve
            </Button>
            <Button
              variant="default"
              disabled={isPending}
              onClick={() => run(() => denyContentQueueItem(item.id))}
              className="px-4 py-2"
            >
              Deny
            </Button>
            {canRetryImage ? (
              <Button
                variant="default"
                disabled={isPending}
                onClick={() => {
                  setRetryingImage(true);
                  run(async () => {
                    try {
                      await regenerateContentQueueItem(
                        item.id,
                        promptDraft || item.prompt,
                      );
                    } catch (err) {
                      setRetryingImage(false);
                      throw err;
                    }
                  });
                }}
                className="px-4 py-2"
              >
                Retry image
              </Button>
            ) : null}
            {!imagesReady && formatNeedsImages(item.format) ? (
              <p className="basis-full text-[13px] text-muted">
                {generating
                  ? "Approve unlocks when the image arrives."
                  : "Image generation didn't start."}
              </p>
            ) : null}
          </>
        ) : null}

        {item.status === "approved" ? (
          <>
            <Button
              variant="primary"
              disabled={isPending || item.image_urls.length === 0}
              onClick={handleDownload}
              className="px-4 py-2"
            >
              Download
            </Button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => revertContentQueueItem(item.id))}
              className="text-[13px] font-medium text-muted hover:text-ink hover:underline disabled:opacity-50"
            >
              Revert
            </button>
          </>
        ) : null}
      </div>

      {item.status === "denied" ? (
        <div className="mt-4 rounded-[var(--radius-inner)] bg-well p-3 shadow-recessed">
          <label className="mb-1.5 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
            Prompt
          </label>
          <Textarea
            value={promptDraft}
            onChange={(e) => setPromptDraft(e.target.value)}
            rows={4}
            className="bg-surface"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              disabled={isPending}
              onClick={() => {
                setRetryingImage(true);
                run(async () => {
                  try {
                    await regenerateContentQueueItem(item.id, promptDraft);
                  } catch (err) {
                    setRetryingImage(false);
                    throw err;
                  }
                });
              }}
              className="px-4 py-2"
            >
              Regenerate
            </Button>
            <Button
              variant="default"
              disabled={isPending}
              onClick={() => run(() => revertContentQueueItem(item.id))}
              className="px-4 py-2"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[13px] text-rosewood">{error}</p> : null}
    </Card>
  );
}

export function ContentQueueBoard({ items }: { items: ContentQueueItem[] }) {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const router = useRouter();

  const waitingOnKie = items.some(
    (item) =>
      formatNeedsImages(item.format) &&
      !imagesReadyForQueue(item) &&
      imageJobStarted(item),
  );

  useEffect(() => {
    if (!waitingOnKie) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    }, IMAGE_POLL_MS);
    return () => window.clearInterval(id);
  }, [waitingOnKie, router]);

  const filtered = items.filter((item) => {
    if (platformFilter !== "all" && item.platform !== platformFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="block min-w-[200px] max-w-[280px] flex-1">
          <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
            Platform
          </span>
          <Select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
            aria-label="Platform"
          >
            <option value="all">All platforms</option>
            {CONTENT_QUEUE_PLATFORMS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="block min-w-[200px] max-w-[280px] flex-1">
          <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
            Status
          </span>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Status"
          >
            <option value="all">All statuses</option>
            {CONTENT_QUEUE_STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState>
          {items.length === 0
            ? "No posts in this week's queue yet."
            : "No posts match these filters."}
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <QueueCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
