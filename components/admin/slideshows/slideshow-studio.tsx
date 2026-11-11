"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  archiveSlideshowDirection,
  discardSlideshowPost,
  saveSlideshowDirection,
  saveSlideshowResults,
  saveSlideshowSettings,
} from "@/app/(admin)/admin/slideshows/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { WEEKDAYS } from "@/lib/admin/slideshows/logic";
import type {
  SlideshowDirection,
  SlideshowPost,
  SlideshowSettings,
  SlideshowSummary,
} from "@/lib/admin/slideshows/types";

type Props = {
  settings: SlideshowSettings;
  candidates: SlideshowPost[];
  selected: SlideshowPost[];
  summaries: SlideshowSummary[];
  directions: SlideshowDirection[];
  latestBatch: { batch_date: string; status: string; requested: number; produced: number; notes: string | null } | null;
};

type Tab = "batch" | "selected" | "summary";

const KIND_LABEL: Record<string, string> = { tip: "Tip", engage: "Engagement", promo: "Promo" };

function shortDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SlideshowStudio(props: Props) {
  const [tab, setTab] = useState<Tab>("batch");
  const needResults = props.selected.filter((p) => !p.result?.views).length;
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "batch", label: "Batch", count: props.candidates.length },
    { key: "selected", label: "Selected", count: needResults || undefined },
    { key: "summary", label: "Weekly summary" },
  ];
  return (
    <div className="space-y-5">
      <div className="flex gap-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] px-4 py-2 text-[14px] font-semibold transition-colors",
              tab === t.key ? "border-accent bg-accent text-surface" : "border-hairline bg-surface text-ink hover:border-accent",
            )}
          >
            {t.label}
            {t.count ? <span className="ml-2 opacity-80">{t.count}</span> : null}
          </button>
        ))}
      </div>
      {tab === "batch" ? <BatchTab {...props} /> : null}
      {tab === "selected" ? <SelectedTab posts={props.selected} /> : null}
      {tab === "summary" ? <SummaryTab summaries={props.summaries} directions={props.directions} /> : null}
    </div>
  );
}

/* ───────────────────────── Batch ───────────────────────── */

function BatchTab({ settings, candidates, latestBatch }: Props) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<null | "download" | "generate" | "custom">(null);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function download() {
    setBusy("download");
    setError(null);
    try {
      const res = await fetch("/api/admin/slideshows/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...picked] }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "Download failed.");
      triggerDownload(await res.blob(), `first-look-slideshows-${new Date().toISOString().slice(0, 10)}.zip`);
      setPicked(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setBusy(null);
    }
  }

  async function post(url: string, body: unknown, kind: "generate" | "custom") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "Something went wrong.");
      if (kind === "custom") setBrief("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  function discard(id: string) {
    startTransition(async () => {
      try {
        await discardSlideshowPost(id);
        setPicked((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not discard.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-5">
        <div className="text-[15px] font-semibold text-ink">Custom post</div>
        <p className="text-[14px] text-muted">
          Describe the angle in plain words. It picks the format and writes the slides; the post lands in this batch.
        </p>
        <Textarea
          rows={3}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          placeholder="e.g. A vote post: would you rather have a bigger guest list or a better venue?"
        />
        <Button
          disabled={busy !== null || brief.trim().length < 10}
          onClick={() => post("/api/admin/slideshows/custom", { brief }, "custom")}
        >
          {busy === "custom" ? "Writing it…" : "Create custom post"}
        </Button>
      </Card>

      <SettingsPanel settings={settings} onGenerate={() => post("/api/admin/slideshows/generate", {}, "generate")} generating={busy === "generate"} />

      {latestBatch ? (
        <p className="text-[13px] text-muted">
          Last batch {shortDate(latestBatch.batch_date)}: {latestBatch.produced} of {latestBatch.requested} written ({latestBatch.status}).
          {latestBatch.notes ? ` Some failed: ${latestBatch.notes.split("\n")[0]}` : ""}
        </p>
      ) : null}

      {error ? <p className="text-[14px] text-rosewood">{error}</p> : null}

      <div className="flex items-center justify-between gap-3">
        <div className="text-[14px] text-muted">
          {candidates.length} to review{picked.size ? ` · ${picked.size} picked` : ""}
        </div>
        <Button disabled={picked.size === 0 || busy !== null} onClick={download}>
          {busy === "download" ? "Building zip…" : `Download ${picked.size || ""} with captions`.replace("  ", " ")}
        </Button>
      </div>

      {candidates.length === 0 ? (
        <EmptyState>Nothing to review. The next batch builds on your batch day, or generate one now above.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {candidates.map((post) => (
            <CandidateCard key={post.id} post={post} checked={picked.has(post.id)} onToggle={() => toggle(post.id)} onDiscard={() => discard(post.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateCard({ post, checked, onToggle, onDiscard }: { post: SlideshowPost; checked: boolean; onToggle: () => void; onDiscard: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className={cn("space-y-3 p-4", checked && "ring-2 ring-accent")}>
      <div className="flex gap-3">
        {post.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumb_url} alt="" className="h-40 w-[90px] flex-none rounded-lg object-cover" />
        ) : (
          <div className="h-40 w-[90px] flex-none rounded-lg bg-well" />
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <Pill variant={post.kind === "engage" ? "accent" : post.kind === "promo" ? "clay" : "default"}>{KIND_LABEL[post.kind] ?? post.kind}</Pill>
            <Pill>{post.mechanic.replace(/_/g, " ")}</Pill>
            {post.origin === "custom" ? <Pill variant="plum">Custom</Pill> : null}
          </div>
          <div className="text-[15px] font-semibold leading-snug text-ink">{post.title}</div>
          <div className="text-[13px] text-muted">{post.image_paths.length} slides · {post.feature.replace(/_/g, " ")}</div>
        </div>
      </div>
      <button className="cursor-pointer text-[13px] font-semibold text-accent" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide caption" : "Show caption"}
      </button>
      {open ? (
        <div className="space-y-2 text-[13px] text-ink">
          <p className="whitespace-pre-wrap">{post.caption}</p>
          {post.pinned_comment ? <p className="text-muted">Pinned comment: {post.pinned_comment}</p> : null}
        </div>
      ) : null}
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-ink">
          <input type="checkbox" checked={checked} onChange={onToggle} /> Use this
        </label>
        <button className="cursor-pointer text-[13px] text-muted hover:text-rosewood" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </Card>
  );
}

function SettingsPanel({ settings, onGenerate, generating }: { settings: SlideshowSettings; onGenerate: () => void; generating: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await saveSlideshowSettings({
          batch_weekday: draft.batch_weekday,
          batch_size: draft.batch_size,
          engagement_share: draft.engagement_share,
          summary_weekday: draft.summary_weekday,
          auto_generate: draft.auto_generate,
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  const dayOptions = WEEKDAYS.map((d, i) => (
    <option key={d} value={i}>
      {d}
    </option>
  ));

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[14px] text-ink">
          New batch of <strong>{settings.batch_size}</strong> every <strong>{WEEKDAYS[settings.batch_weekday]}</strong>
          {settings.auto_generate ? "" : " (auto off)"}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Settings"}
          </Button>
          <Button variant="secondary" disabled={generating} onClick={onGenerate}>
            {generating ? "Generating… (a few minutes)" : "Generate batch now"}
          </Button>
        </div>
      </div>
      {open ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-[13px] font-semibold text-muted">
            Batch day
            <Select value={draft.batch_weekday} onChange={(e) => setDraft({ ...draft, batch_weekday: Number(e.target.value) })}>
              {dayOptions}
            </Select>
          </label>
          <label className="space-y-1 text-[13px] font-semibold text-muted">
            Weekly summary day
            <Select value={draft.summary_weekday} onChange={(e) => setDraft({ ...draft, summary_weekday: Number(e.target.value) })}>
              {dayOptions}
            </Select>
          </label>
          <label className="space-y-1 text-[13px] font-semibold text-muted">
            Posts per batch
            <Input type="number" min={4} max={20} value={draft.batch_size} onChange={(e) => setDraft({ ...draft, batch_size: Number(e.target.value) })} />
          </label>
          <label className="space-y-1 text-[13px] font-semibold text-muted">
            Starting engagement share ({Math.round(draft.engagement_share * 100)}%)
            <input
              type="range"
              min={20}
              max={80}
              step={5}
              className="w-full"
              value={Math.round(draft.engagement_share * 100)}
              onChange={(e) => setDraft({ ...draft, engagement_share: Number(e.target.value) / 100 })}
            />
          </label>
          <label className="flex items-center gap-2 text-[14px] font-semibold text-ink sm:col-span-2">
            <input type="checkbox" checked={draft.auto_generate} onChange={(e) => setDraft({ ...draft, auto_generate: e.target.checked })} />
            Build the batch automatically on batch day
          </label>
          {error ? <p className="text-[13px] text-rosewood sm:col-span-2">{error}</p> : null}
          <div className="sm:col-span-2">
            <Button disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

/* ───────────────────────── Selected ───────────────────────── */

type Draft = { post_url: string; views: string; likes: string; comments: string; shares: string; saves: string; link_clicks: string; signups: string; notes: string; posted_on: string };

const NUM_FIELDS = ["views", "likes", "comments", "shares", "saves", "link_clicks", "signups"] as const;
const NUM_LABEL: Record<(typeof NUM_FIELDS)[number], string> = {
  views: "Views",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
  link_clicks: "Link clicks",
  signups: "Signups",
};

function toNumber(v: string): number | null {
  const c = v.replace(/[,\s]/g, "");
  if (!c) return null;
  const n = Number(c);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function draftFrom(post: SlideshowPost): Draft {
  const r = post.result;
  const n = (v: number | null | undefined) => (typeof v === "number" ? String(v) : "");
  return {
    post_url: r?.post_url ?? "",
    views: n(r?.views),
    likes: n(r?.likes),
    comments: n(r?.comments),
    shares: n(r?.shares),
    saves: n(r?.saves),
    link_clicks: n(r?.link_clicks),
    signups: n(r?.signups),
    notes: r?.notes ?? "",
    posted_on: post.posted_on ?? "",
  };
}

function SelectedTab({ posts }: { posts: SlideshowPost[] }) {
  if (posts.length === 0) {
    return <EmptyState>Nothing selected yet. Posts you download from the Batch tab show up here so you can log results a week after posting.</EmptyState>;
  }
  const waiting = posts.filter((p) => !p.result?.views);
  const logged = posts.filter((p) => p.result?.views);
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-ink">Waiting on results ({waiting.length})</h2>
        <p className="text-[13px] text-muted">Posts with no results or zero views are ignored by the next batch until you fill them in.</p>
        {waiting.map((p) => (
          <SelectedCard key={p.id} post={p} />
        ))}
      </section>
      {logged.length ? (
        <section className="space-y-3">
          <h2 className="text-[15px] font-semibold text-ink">Logged ({logged.length})</h2>
          {logged.map((p) => (
            <SelectedCard key={p.id} post={p} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function SelectedCard({ post }: { post: SlideshowPost }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const hasViews = Boolean(post.result?.views);
  const [editing, setEditing] = useState(!hasViews);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(post));
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await saveSlideshowResults(post.id, {
          post_url: draft.post_url.trim() || null,
          views: toNumber(draft.views),
          likes: toNumber(draft.likes),
          comments: toNumber(draft.comments),
          shares: toNumber(draft.shares),
          saves: toNumber(draft.saves),
          link_clicks: toNumber(draft.link_clicks),
          signups: toNumber(draft.signups),
          notes: draft.notes.trim() || null,
          posted_on: draft.posted_on || null,
        });
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save results.");
      }
    });
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex gap-3">
        {post.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.thumb_url} alt="" className="h-24 w-[54px] flex-none rounded-lg object-cover" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5 pb-1">
            <Pill variant={post.kind === "engage" ? "accent" : "default"}>{KIND_LABEL[post.kind] ?? post.kind}</Pill>
            <Pill>{post.angle_key.replace(/[:_]/g, " ")}</Pill>
          </div>
          <div className="text-[15px] font-semibold text-ink">{post.title}</div>
          <div className="text-[13px] text-muted">Downloaded {shortDate(post.downloaded_at)}</div>
        </div>
        {hasViews && !editing ? (
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
      </div>
      {hasViews && !editing ? (
        <div className="text-[13px] text-ink">
          {NUM_FIELDS.filter((f) => typeof post.result?.[f] === "number")
            .map((f) => `${NUM_LABEL[f]} ${post.result?.[f]?.toLocaleString()}`)
            .join(" · ")}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {NUM_FIELDS.map((f) => (
              <label key={f} className="space-y-1 text-[12px] font-semibold text-muted">
                {NUM_LABEL[f]}
                <Input inputMode="numeric" value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} />
              </label>
            ))}
            <label className="space-y-1 text-[12px] font-semibold text-muted">
              Posted on
              <Input type="date" value={draft.posted_on} onChange={(e) => setDraft({ ...draft, posted_on: e.target.value })} />
            </label>
          </div>
          <Input placeholder="Post link (optional)" value={draft.post_url} onChange={(e) => setDraft({ ...draft, post_url: e.target.value })} />
          <Textarea rows={2} placeholder="Notes: what the comments said, anything notable" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}
          <Button disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save results"}
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ───────────────────────── Summary ───────────────────────── */

function SummaryTab({ summaries, directions }: { summaries: SlideshowSummary[]; directions: SlideshowDirection[] }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const latest = summaries[0];

  function send() {
    setError(null);
    startTransition(async () => {
      try {
        await saveSlideshowDirection(reply, latest?.id ?? null, latest ? "reply" : "note");
        setReply("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function archive(id: string) {
    startTransition(async () => {
      await archiveSlideshowDirection(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {latest ? (
        <Card className="space-y-3 p-5">
          <div className="text-[13px] font-semibold text-muted">Week of {shortDate(latest.week_start)}</div>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{latest.body}</p>
        </Card>
      ) : (
        <EmptyState>No summary yet. The first weekly summary is written on your summary day once posts have results. You can leave direction below any time.</EmptyState>
      )}

      <Card className="space-y-3 p-5">
        <div className="text-[15px] font-semibold text-ink">{latest ? "Reply" : "Give direction"}</div>
        <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="e.g. Votes are working. Do more budget ones, and rest the seating angle." />
        {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}
        <Button disabled={pending || reply.trim().length < 3} onClick={send}>
          {pending ? "Saving…" : "Send to the next batch"}
        </Button>
      </Card>

      {directions.length ? (
        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold text-ink">Active direction</h2>
          {directions.map((d) => (
            <Card key={d.id} className="flex items-start justify-between gap-3 p-4">
              <p className="text-[14px] text-ink">{d.body}</p>
              <button className="cursor-pointer flex-none text-[13px] text-muted hover:text-rosewood" onClick={() => archive(d.id)}>
                Retire
              </button>
            </Card>
          ))}
        </section>
      ) : null}

      {summaries.length > 1 ? (
        <section className="space-y-2">
          <h2 className="text-[15px] font-semibold text-ink">Earlier weeks</h2>
          {summaries.slice(1).map((s) => (
            <Card key={s.id} className="space-y-1 p-4">
              <div className="text-[12px] font-semibold text-muted">Week of {shortDate(s.week_start)}</div>
              <p className="whitespace-pre-wrap text-[14px] text-ink">{s.body}</p>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
