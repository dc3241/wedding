"use client";

import { savePostResults } from "@/app/(admin)/admin/ideation/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Textarea } from "@/components/ui/textarea";
import { formatLabel } from "@/lib/admin/content-formats";
import { contentQueuePlatformMeta } from "@/lib/admin/content-queue";
import {
  engagementRate,
  hasAnyNumber,
  RESULT_NUMBER_FIELDS,
  resultFieldLabel,
  type ResultNumberField,
} from "@/lib/admin/post-results";
import type { PostedPost } from "@/lib/admin/queries";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Draft = Record<ResultNumberField, string> & { post_url: string; notable_comments: string };

function draftFrom(post: PostedPost): Draft {
  const r = post.result;
  const num = (v: number | null | undefined) => (typeof v === "number" ? String(v) : "");
  return {
    post_url: r?.post_url ?? "",
    views: num(r?.views),
    likes: num(r?.likes),
    comments: num(r?.comments),
    shares: num(r?.shares),
    saves: num(r?.saves),
    notable_comments: r?.notable_comments ?? "",
  };
}

function toNumber(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "");
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}

function shortDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PostedCard({ post }: { post: PostedPost }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const logged = post.result ? hasAnyNumber(post.result) : false;
  const [editing, setEditing] = useState(!logged);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(post));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const platform = contentQueuePlatformMeta(post.platform);
  const rate = post.result ? engagementRate(post.result) : null;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await savePostResults(post.id, {
          post_url: draft.post_url.trim() || null,
          views: toNumber(draft.views),
          likes: toNumber(draft.likes),
          comments: toNumber(draft.comments),
          shares: toNumber(draft.shares),
          saves: toNumber(draft.saves),
          notable_comments: draft.notable_comments.trim() || null,
        });
        setSaved(true);
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save results.");
      }
    });
  }

  return (
    <Card className="px-4 py-3">
      <div className="flex gap-3">
        <div className="w-16 shrink-0">
          {post.thumb_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
            <img
              src={post.thumb_url}
              alt=""
              className={`w-full rounded-[var(--radius-inner)] object-cover ${platform.aspectClass}`}
            />
          ) : (
            <div className={`w-full rounded-[var(--radius-inner)] bg-well ${platform.aspectClass}`} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Pill variant="default">{platform.label}</Pill>
            {post.format ? <Pill variant="default">{formatLabel(post.format)}</Pill> : null}
            {logged ? <Pill variant="sage">Logged</Pill> : <Pill variant="clay">Needs results</Pill>}
            <span className="text-[13px] text-muted">{shortDate(post.approved_at)}</span>
          </div>
          <p className="line-clamp-2 text-[15px] font-medium text-ink">{post.hook || post.pillar}</p>
          {logged && !editing && post.result ? (
            <p className="mt-1 text-[13px] text-muted">
              {RESULT_NUMBER_FIELDS.filter((f) => typeof post.result![f] === "number")
                .map((f) => `${post.result![f]!.toLocaleString("en-US")} ${resultFieldLabel(post.platform, f).toLowerCase()}`)
                .join(" · ")}
              {rate !== null ? ` · ${(rate * 100).toFixed(1)}% engagement` : ""}
            </p>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {RESULT_NUMBER_FIELDS.map((field) => (
              <label key={field} className="block">
                <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
                  {resultFieldLabel(post.platform, field)}
                </span>
                <Input
                  inputMode="numeric"
                  value={draft[field]}
                  onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                  placeholder="0"
                />
              </label>
            ))}
          </div>
          <label className="mt-2 block">
            <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              Post link
            </span>
            <Input
              value={draft.post_url}
              onChange={(e) => setDraft((d) => ({ ...d, post_url: e.target.value }))}
              placeholder="https://www.tiktok.com/@…/photo/…"
            />
          </label>
          <label className="mt-2 block">
            <span className="mb-1 block text-[12px] font-semibold tracking-[0.09em] text-muted uppercase">
              Notable comments (optional)
            </span>
            <Textarea
              rows={2}
              value={draft.notable_comments}
              onChange={(e) => setDraft((d) => ({ ...d, notable_comments: e.target.value }))}
              placeholder="Paste a few comments that show what people reacted to."
            />
          </label>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <Button variant="primary" onClick={save} disabled={isPending} className="px-4 py-2">
              {isPending ? "Saving…" : "Save results"}
            </Button>
            {logged ? (
              <Button variant="default" onClick={() => setEditing(false)} className="px-4 py-2">
                Cancel
              </Button>
            ) : null}
          </>
        ) : (
          <Button variant="default" onClick={() => setEditing(true)} className="px-4 py-2">
            Update results
          </Button>
        )}
        {post.result?.post_url && !editing ? (
          <a
            href={post.result.post_url}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-medium text-accent hover:underline"
          >
            Open post
          </a>
        ) : null}
        {saved ? <span className="text-[13px] text-sage">Saved</span> : null}
      </div>
      {error ? <p className="mt-2 text-[13px] text-rosewood">{error}</p> : null}
    </Card>
  );
}

export function PostedResults({ posts }: { posts: PostedPost[] }) {
  return (
    <section className="mt-8">
      <h2 className="mb-1 text-[19px] font-extrabold tracking-[-0.02em] text-ink">Posted · log results</h2>
      <p className="mb-3 text-[13px] text-muted">
        After a post has been up a few days, add its numbers. Generate 10 ideas reads the best and
        weakest posts on that platform and leans toward what worked.
      </p>
      {posts.length === 0 ? (
        <EmptyState>Approved posts show up here so you can log how they did.</EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {posts.map((post) => (
            <PostedCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
