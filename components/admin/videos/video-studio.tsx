"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  deleteFootage,
  discardVideo,
  registerFootage,
  saveVideoScript,
} from "@/app/(admin)/admin/videos/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { FEATURES } from "@/lib/admin/slideshows/logic";
import {
  VISUAL_TYPES,
  emptyVisual,
  footageNeeds,
  footageScore,
  voiceText,
  wordCount,
  type Segment,
  type Visual,
} from "@/lib/admin/videos/script";
import { VIDEO_BUCKET, type VideoFootage, type VideoPost } from "@/lib/admin/videos/types";
import { createClient } from "@/utils/supabase/client";

type Props = {
  ideas: VideoPost[];
  queue: VideoPost[];
  finished: VideoPost[];
  footage: VideoFootage[];
};

type Tab = "ideas" | "scripts" | "footage" | "finished";

const KIND_LABEL: Record<string, string> = { tip: "Tip", engage: "Engagement", promo: "Promo" };
const VISUAL_LABEL: Record<Visual["type"], string> = {
  text: "Animated text",
  cards: "Cards (list / quiz / ranking)",
  footage: "Screen recording",
  pause: "Pause + countdown",
  ask: "Comment ask",
  cta: "“Look” CTA outro",
};

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(json?.error ?? "Something went wrong.");
  return json as T;
}

export function VideoStudio(props: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(props.queue.length && !props.ideas.length ? "scripts" : "ideas");
  const rendering = props.queue.some((p) => p.render_status === "rendering");

  useEffect(() => {
    if (!rendering) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [rendering, router]);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "ideas", label: "Ideas", count: props.ideas.length },
    { key: "scripts", label: "Scripts & voiceover", count: props.queue.length },
    { key: "footage", label: "Footage", count: props.footage.length },
    { key: "finished", label: "Finished", count: props.finished.length },
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist">
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
      {tab === "ideas" ? <IdeasTab ideas={props.ideas} onWritten={() => setTab("scripts")} /> : null}
      {tab === "scripts" ? <ScriptsTab queue={props.queue} footage={props.footage} /> : null}
      {tab === "footage" ? <FootageTab footage={props.footage} /> : null}
      {tab === "finished" ? <FinishedTab posts={props.finished} /> : null}
    </div>
  );
}

/* ───────────────────────── Ideas ───────────────────────── */

function IdeasTab({ ideas, onWritten }: { ideas: VideoPost[]; onWritten: () => void }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<null | "ideas" | "scripts">(null);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generate() {
    setBusy("ideas");
    setError(null);
    try {
      await postJson("/api/admin/videos/ideas");
      setPicked(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate ideas.");
    } finally {
      setBusy(null);
    }
  }

  async function writeScripts() {
    setBusy("scripts");
    setError(null);
    setNotes([]);
    try {
      const out = await postJson<{ results: { id: string; ok: boolean; issues?: string[] }[] }>("/api/admin/videos/scripts", { ids: [...picked] });
      const failed = out.results.filter((r) => !r.ok);
      if (failed.length) setNotes(failed.map((f) => `${ideas.find((i) => i.id === f.id)?.title ?? "An idea"}: ${(f.issues ?? []).join("; ")}`));
      setPicked(new Set());
      router.refresh();
      if (failed.length < out.results.length) onWritten();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not write the scripts.");
    } finally {
      setBusy(null);
    }
  }

  function discard(id: string) {
    startTransition(async () => {
      await discardVideo(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" disabled={busy !== null} onClick={generate}>
          {busy === "ideas" ? "Generating ideas…" : "Generate 10 new ideas"}
        </Button>
        <Button disabled={picked.size === 0 || busy !== null} onClick={writeScripts}>
          {busy === "scripts" ? "Writing scripts… (about a minute)" : `Write scripts for ${picked.size || ""} selected`.replace("  ", " ")}
        </Button>
      </div>
      {error ? <p className="text-[14px] text-rosewood">{error}</p> : null}
      {notes.map((n) => (
        <p key={n} className="text-[13px] text-rosewood">{n}</p>
      ))}
      {ideas.length === 0 ? (
        <EmptyState>No ideas waiting. Generate ten: half tips, half engagement, rotated so angles don&apos;t repeat.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {ideas.map((idea) => (
            <Card key={idea.id} className={cn("space-y-3 p-4", picked.has(idea.id) && "ring-2 ring-accent")}>
              <div className="flex flex-wrap gap-1.5">
                <Pill variant={idea.kind === "engage" ? "accent" : idea.kind === "promo" ? "clay" : "default"}>{KIND_LABEL[idea.kind]}</Pill>
                <Pill>{idea.mechanic.replace(/_/g, " ")}</Pill>
                <Pill>{idea.feature.replace(/_/g, " ")}</Pill>
              </div>
              <div className="text-[16px] font-semibold leading-snug text-ink">{idea.title}</div>
              {idea.hook ? <p className="text-[14px] italic text-ink">“{idea.hook}”</p> : null}
              <p className="text-[14px] text-muted">{idea.concept}</p>
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-ink">
                  <input type="checkbox" checked={picked.has(idea.id)} onChange={() => toggle(idea.id)} /> Make this one
                </label>
                <button className="cursor-pointer text-[13px] text-muted hover:text-rosewood" onClick={() => discard(idea.id)}>
                  Discard
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Scripts ───────────────────────── */

function ScriptsTab({ queue, footage }: { queue: VideoPost[]; footage: VideoFootage[] }) {
  if (queue.length === 0) {
    return <EmptyState>No scripts in progress. Pick ideas on the Ideas tab and I&apos;ll write them.</EmptyState>;
  }
  return (
    <div className="space-y-4">
      {queue.map((post) => (
        <ScriptCard key={post.id} post={post} footage={footage} />
      ))}
    </div>
  );
}

function linesToItems(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const correct = line.startsWith("*");
      const [label, sub] = line.replace(/^\*\s*/, "").split("|").map((x) => x.trim());
      return { label: label ?? "", sub: sub ?? "", correct };
    })
    .filter((i) => i.label);
}

function itemsToLines(items: { label: string; sub: string; correct: boolean }[]) {
  return items.map((i) => `${i.correct ? "* " : ""}${i.label}${i.sub ? ` | ${i.sub}` : ""}`).join("\n");
}

function ScriptCard({ post, footage }: { post: VideoPost; footage: VideoFootage[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption);
  const [pinned, setPinned] = useState(post.pinned_comment);
  const [segments, setSegments] = useState<Segment[]>(post.script);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "voice" | "render">(null);
  const [error, setError] = useState<string | null>(null);

  const text = voiceText(segments);
  const words = wordCount(text);
  const voiceStale = post.vo_path !== null && post.vo_text !== text;
  const needs = footageNeeds(segments);
  const missing = needs.filter((n) => !n.satisfied);
  const rendering = post.render_status === "rendering";

  function edit(next: Segment[]) {
    setSegments(next);
    setDirty(true);
  }
  function patch(i: number, partial: Partial<Segment>) {
    edit(segments.map((s, idx) => (idx === i ? { ...s, ...partial } : s)));
  }
  function setVisual(i: number, visual: Visual) {
    edit(segments.map((s, idx) => (idx === i ? { ...s, visual, text: visual.type === "pause" ? "" : s.text } : s)));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= segments.length) return;
    const next = [...segments];
    [next[i], next[j]] = [next[j] as Segment, next[i] as Segment];
    edit(next);
  }
  function addAfter(i: number) {
    const id = `s${crypto.randomUUID().slice(0, 8)}`;
    const next = [...segments];
    next.splice(i + 1, 0, { id, text: "", visual: emptyVisual("text") });
    edit(next);
  }

  async function save(nextSegments: Segment[] = segments) {
    setBusy("save");
    setError(null);
    try {
      await saveVideoScript(post.id, { title, caption, pinned_comment: pinned, script: nextSegments });
      setDirty(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  async function voiceover() {
    if (dirty) {
      setError("Save the script first so the voiceover reads the latest text.");
      return;
    }
    if (post.vo_path && !window.confirm("Create a new voiceover? This uses ElevenLabs credits again.")) return;
    setBusy("voice");
    setError(null);
    try {
      await postJson(`/api/admin/videos/${post.id}/voiceover`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the voiceover.");
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    if (dirty) {
      setError("Save the script first.");
      return;
    }
    setBusy("render");
    setError(null);
    try {
      await postJson(`/api/admin/videos/${post.id}/render`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the render.");
    } finally {
      setBusy(null);
    }
  }

  const readyReasons: string[] = [];
  if (dirty) readyReasons.push("Unsaved script changes.");
  if (!post.vo_path) readyReasons.push("Voiceover not created.");
  else if (voiceStale) readyReasons.push("Spoken text changed since the voiceover.");
  if (missing.length) readyReasons.push(`${missing.length} screen recording${missing.length > 1 ? "s" : ""} needed.`);
  const canGenerate = readyReasons.length === 0 && !rendering;

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <Pill variant={post.kind === "engage" ? "accent" : "default"}>{KIND_LABEL[post.kind]}</Pill>
            <Pill>{post.mechanic.replace(/_/g, " ")}</Pill>
            {post.vo_path && !voiceStale ? <Pill variant="sage">Voiceover ready</Pill> : null}
            {missing.length ? <Pill variant="clay">{missing.length} recording{missing.length > 1 ? "s" : ""} needed</Pill> : null}
            {rendering ? <Pill variant="plum">Rendering…</Pill> : null}
            {post.render_status === "failed" ? <Pill variant="rosewood">Render failed</Pill> : null}
          </div>
          <div className="text-[17px] font-semibold text-ink">{title}</div>
          <div className="text-[13px] text-muted">{words} spoken words · about {Math.round(words / 2.8 / 1.0)}s</div>
        </div>
        <Button variant="secondary" onClick={() => setOpen((v) => !v)}>
          {open ? "Close editor" : "Edit script"}
        </Button>
      </div>

      {open ? (
        <div className="space-y-4">
          <label className="block space-y-1 text-[13px] font-semibold text-muted">
            Title
            <Input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
          </label>
          <div className="space-y-3">
            {segments.map((seg, i) => (
              <SegmentEditor
                key={seg.id}
                seg={seg}
                index={i}
                total={segments.length}
                post={post}
                footage={footage}
                onText={(t) => patch(i, { text: t })}
                onVisual={(v) => setVisual(i, v)}
                onMove={(d) => move(i, d)}
                onAdd={() => addAfter(i)}
                onDelete={() => edit(segments.filter((_, idx) => idx !== i))}
                onClipChosen={async (clipId) => {
                  const next = segments.map((s, idx) =>
                    idx === i && s.visual.type === "footage" ? { ...s, visual: { ...s.visual, clip_id: clipId } } : s,
                  );
                  setSegments(next);
                  await save(next);
                }}
              />
            ))}
          </div>
          <label className="block space-y-1 text-[13px] font-semibold text-muted">
            Caption (downloads with the video)
            <Textarea rows={4} value={caption} onChange={(e) => { setCaption(e.target.value); setDirty(true); }} />
          </label>
          <label className="block space-y-1 text-[13px] font-semibold text-muted">
            Pinned comment
            <Textarea rows={2} value={pinned} onChange={(e) => { setPinned(e.target.value); setDirty(true); }} />
          </label>
          <Button disabled={busy !== null || !dirty} onClick={() => save()}>
            {busy === "save" ? "Saving…" : dirty ? "Save script" : "Saved"}
          </Button>
        </div>
      ) : null}

      <div className="space-y-3 rounded-[var(--radius-inner)] bg-well p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" disabled={busy !== null || rendering} onClick={voiceover}>
            {busy === "voice" ? "Creating voiceover…" : post.vo_path ? "Re-create voiceover" : "Create voiceover (First Look Voice)"}
          </Button>
          {post.vo_url && !voiceStale ? <audio controls src={post.vo_url} className="h-10" /> : null}
        </div>
        {voiceStale ? <p className="text-[13px] text-rosewood">The spoken text changed since this voiceover was made. Create it again before generating.</p> : null}

        {needs.length ? (
          <div className="space-y-1 text-[13px] text-ink">
            {needs.map((n) => (
              <div key={n.segmentId}>
                {n.satisfied ? "✓" : "○"} {n.need || "Screen recording"} {n.satisfied ? `(${n.source === "library" ? "from your library" : "uploaded"})` : "— choose or upload it in the editor above"}
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!canGenerate || busy !== null} onClick={generate}>
            {rendering ? "Rendering… (3–6 min)" : busy === "render" ? "Starting…" : "Generate video"}
          </Button>
          {!canGenerate && !rendering ? <span className="text-[13px] text-muted">{readyReasons.join(" ")}</span> : null}
        </div>
        {post.render_status === "failed" && post.render_error ? <p className="text-[13px] text-rosewood">{post.render_error}</p> : null}
        {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}
      </div>
    </Card>
  );
}

function SegmentEditor(props: {
  seg: Segment;
  index: number;
  total: number;
  post: VideoPost;
  footage: VideoFootage[];
  onText: (t: string) => void;
  onVisual: (v: Visual) => void;
  onMove: (d: -1 | 1) => void;
  onAdd: () => void;
  onDelete: () => void;
  onClipChosen: (clipId: string | null) => Promise<void>;
}) {
  const { seg, index, total, post, footage } = props;
  const v = seg.visual;
  const [itemsText, setItemsText] = useState(v.type === "cards" ? itemsToLines(v.items) : "");
  return (
    <div className="space-y-2 rounded-[var(--radius-inner)] border border-hairline p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-muted">Segment {index + 1}</span>
        <div className="flex gap-1 text-[13px]">
          <button className="cursor-pointer px-2 text-muted hover:text-accent disabled:opacity-30" disabled={index === 0} onClick={() => props.onMove(-1)}>↑</button>
          <button className="cursor-pointer px-2 text-muted hover:text-accent disabled:opacity-30" disabled={index === total - 1} onClick={() => props.onMove(1)}>↓</button>
          <button className="cursor-pointer px-2 text-muted hover:text-accent" onClick={props.onAdd}>+ add below</button>
          <button className="cursor-pointer px-2 text-muted hover:text-rosewood" onClick={props.onDelete}>Delete</button>
        </div>
      </div>
      {v.type === "pause" ? null : (
        <Textarea rows={2} value={seg.text} onChange={(e) => props.onText(e.target.value)} placeholder="Exactly what the voice says" />
      )}
      <label className="block space-y-1 text-[12px] font-semibold text-muted">
        What&apos;s on screen
        <Select value={v.type} onChange={(e) => props.onVisual(emptyVisual(e.target.value as Visual["type"]))}>
          {VISUAL_TYPES.map((t) => (
            <option key={t} value={t}>{VISUAL_LABEL[t]}</option>
          ))}
        </Select>
      </label>

      {v.type === "text" ? (
        <Input
          placeholder="Words to highlight, comma separated"
          defaultValue={v.highlight.join(", ")}
          onBlur={(e) => props.onVisual({ ...v, highlight: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
        />
      ) : null}

      {v.type === "cards" ? (
        <div className="space-y-2">
          <Input placeholder="Heading above the cards" value={v.title} onChange={(e) => props.onVisual({ ...v, title: e.target.value })} />
          <Textarea
            rows={4}
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
            onBlur={() => props.onVisual({ ...v, items: linesToItems(itemsText) })}
            placeholder={"One card per line. Add a subtitle after |. Start a line with * to mark it as an answer."}
          />
          <div className="flex gap-4 text-[13px] text-ink">
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.numbered} onChange={(e) => props.onVisual({ ...v, numbered: e.target.checked })} /> Numbered</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.shuffle} onChange={(e) => props.onVisual({ ...v, shuffle: e.target.checked })} /> Cards swap places (ranking)</label>
          </div>
        </div>
      ) : null}

      {v.type === "pause" ? (
        <label className="block space-y-1 text-[12px] font-semibold text-muted">
          Seconds of silence
          <Input type="number" min={1} max={8} value={v.seconds} onChange={(e) => props.onVisual({ ...v, seconds: Number(e.target.value) })} />
        </label>
      ) : null}

      {v.type === "ask" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Button text" value={v.pill} onChange={(e) => props.onVisual({ ...v, pill: e.target.value })} />
          <Input placeholder="Chips, comma separated" defaultValue={v.chips.join(", ")} onBlur={(e) => props.onVisual({ ...v, chips: e.target.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 4) })} />
        </div>
      ) : null}

      {v.type === "cta" ? (
        <Input placeholder="keep your budget in check" value={v.outcome} onChange={(e) => props.onVisual({ ...v, outcome: e.target.value })} />
      ) : null}

      {v.type === "footage" ? <FootagePicker seg={seg} visual={v} post={post} footage={footage} onVisual={props.onVisual} onClipChosen={props.onClipChosen} /> : null}
    </div>
  );
}

function FootagePicker({
  seg, visual, post, footage, onVisual, onClipChosen,
}: {
  seg: Segment;
  visual: Extract<Visual, { type: "footage" }>;
  post: VideoPost;
  footage: VideoFootage[];
  onVisual: (v: Visual) => void;
  onClipChosen: (clipId: string | null) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ranked = [...footage].sort((a, b) => footageScore(visual.need, b, post.feature) - footageScore(visual.need, a, post.feature));
  const chosen = footage.find((f) => f.id === visual.clip_id);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
      const path = `footage/${crypto.randomUUID()}-${safe}`;
      const supabase = createClient();
      const { error: upError } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
      if (upError) throw new Error(upError.message);
      const isImage = file.type.startsWith("image/");
      const { id } = await registerFootage({
        title: visual.need.slice(0, 100) || file.name,
        description: visual.need,
        feature: post.feature,
        path,
        media_type: isImage ? "image" : "video",
        size_bytes: file.size,
        duration_sec: null,
      });
      await onClipChosen(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Input placeholder="What should the screen show?" value={visual.need} onChange={(e) => onVisual({ ...visual, need: e.target.value })} />
      <Input placeholder="Overlay caption (optional)" value={visual.caption} onChange={(e) => onVisual({ ...visual, caption: e.target.value })} />
      <label className="block space-y-1 text-[12px] font-semibold text-muted">
        Recording to use
        <Select value={visual.clip_id ?? ""} onChange={(e) => void onClipChosen(e.target.value || null)}>
          <option value="">{footage.length ? "None chosen yet" : "Library is empty. Upload one below."}</option>
          {ranked.map((f, i) => (
            <option key={f.id} value={f.id}>{i === 0 && footageScore(visual.need, f, post.feature) > 0.4 ? "★ " : ""}{f.title}</option>
          ))}
        </Select>
      </label>
      {chosen?.url && chosen.media_type === "video" ? <video src={chosen.url} controls preload="metadata" className="h-40 rounded-lg" /> : null}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer text-[13px] font-semibold text-accent">
          {uploading ? "Uploading…" : "Upload a new recording or image"}
          <input type="file" accept="video/*,image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        </label>
        <span className="text-[12px] text-muted">Saved to your library for reuse.</span>
      </div>
      <input type="hidden" value={seg.id} readOnly />
      {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}
    </div>
  );
}

/* ───────────────────────── Footage library ───────────────────────── */

function FootageTab({ footage }: { footage: VideoFootage[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [feature, setFeature] = useState("assistant_venue_search");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload(file: File) {
    if (!title.trim()) {
      setError("Give it a title first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
      const path = `footage/${crypto.randomUUID()}-${safe}`;
      const supabase = createClient();
      const { error: upError } = await supabase.storage.from(VIDEO_BUCKET).upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
      if (upError) throw new Error(upError.message);
      await registerFootage({
        title: title.trim(),
        description: description.trim(),
        feature,
        path,
        media_type: file.type.startsWith("image/") ? "image" : "video",
        size_bytes: file.size,
        duration_sec: null,
      });
      setTitle("");
      setDescription("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    if (!window.confirm("Delete this recording from the library?")) return;
    startTransition(async () => {
      await deleteFootage(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-5">
        <div className="text-[15px] font-semibold text-ink">Add a screen recording or image</div>
        <p className="text-[14px] text-muted">Describe what&apos;s on screen. New scripts look here first and reuse a matching clip before asking you for a new one.</p>
        <Input placeholder="Title, e.g. Assistant finding venues and drafting messages" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea rows={2} placeholder="What it shows, step by step (this is how scripts find it)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Select value={feature} onChange={(e) => setFeature(e.target.value)}>
          {FEATURES.map((f) => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </Select>
        <label className={cn("inline-block cursor-pointer rounded-[var(--radius-pill)] border-[1.5px] border-accent bg-accent px-5 py-2.5 text-[14px] font-semibold text-surface", busy && "opacity-50")}>
          {busy ? "Uploading…" : "Choose file and upload"}
          <input type="file" accept="video/*,image/*" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
        </label>
        {error ? <p className="text-[13px] text-rosewood">{error}</p> : null}
      </Card>
      {footage.length === 0 ? (
        <EmptyState>Your library is empty.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {footage.map((f) => (
            <Card key={f.id} className="space-y-2 p-4">
              {f.url && f.media_type === "video" ? <video src={f.url} controls preload="metadata" className="h-56 w-full rounded-lg bg-black object-contain" /> : null}
              {f.url && f.media_type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt="" className="h-56 w-full rounded-lg object-contain" />
              ) : null}
              <div className="text-[15px] font-semibold text-ink">{f.title}</div>
              <p className="text-[13px] text-muted">{f.description}</p>
              <div className="flex items-center justify-between">
                <Pill>{f.feature.replace(/_/g, " ")}</Pill>
                <button className="cursor-pointer text-[13px] text-muted hover:text-rosewood" onClick={() => remove(f.id)}>Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Finished ───────────────────────── */

function FinishedTab({ posts }: { posts: VideoPost[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  if (posts.length === 0) return <EmptyState>Finished videos show up here with their caption, ready to download.</EmptyState>;
  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <Card key={p.id} className="grid gap-4 p-5 sm:grid-cols-[200px_1fr]">
          {p.video_url ? <video src={p.video_url} controls preload="metadata" className="w-full rounded-lg bg-black" /> : <div className="h-64 rounded-lg bg-well" />}
          <div className="space-y-3">
            <div className="text-[17px] font-semibold text-ink">{p.title}</div>
            <div className="whitespace-pre-wrap rounded-[var(--radius-inner)] bg-well p-3 text-[14px] text-ink">{p.caption}</div>
            {p.pinned_comment ? <p className="text-[13px] text-muted">Pinned comment: {p.pinned_comment}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <a href={`/api/admin/videos/${p.id}/download`} className="inline-flex items-center rounded-[var(--radius-pill)] border-[1.5px] border-accent bg-accent px-5 py-2.5 text-[14px] font-semibold text-surface">
                Download video + caption
              </a>
              <button
                className="cursor-pointer text-[13px] text-muted hover:text-rosewood"
                onClick={() => startTransition(async () => { await discardVideo(p.id); router.refresh(); })}
              >
                Remove from list
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
