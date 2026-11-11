/**
 * Pure helpers for the video flow: the script model (an ordered list of
 * segments, each with spoken text and a visual), alignment of the ElevenLabs
 * character timings back onto those segments, the final timeline (voice sped
 * up 10%, silences spliced in for pauses), and the copy checks.
 * No imports from the app (so it runs under `node --test`), except the shared
 * copy-rule regexes from the slideshow logic.
 */

// Same rules as lib/admin/slideshows/logic.ts. Duplicated on purpose so this file has no
// imports and runs under `node --test`. Keep the two in step.
const AI_WORD = /\bA\.?I\.?\b|artificial intelligence|\bAI-/i;
const PRICING_CLAIM =
  /\b(fits?|within|under|inside|matches?)\s+(your|the|any)\s+budget\b|\b(returns?|shows?|compares?|lists?|finds?|pulls?)\s+(you\s+)?(venue\s+|vendor\s+)?(prices?|pricing|quotes?|costs?)\b|\bcheapest\b|\bbest (prices?|deals?)\b|\bwithin budget\b/i;
const MADE_UP_STATS =
  /\b\d{1,3}\s?%|\bstud(y|ies) (show|found|say)|\bstatistics?\b|\bon average\b|\bthe average (couple|wedding)\b|\bmost couples (spend|pay)\b|\bresearch (shows|says)\b/i;
const TESTIMONIAL =
  /\b(our (customers|users|couples) (say|love|told us)|one (couple|bride|groom) told us|a (bride|couple) told us|testimonial|reviews? (say|from))\b/i;
const FIRST_LOOK = /first\s?look/gi;
const ASSISTANT_FEATURES = new Set(["assistant_venue_search", "assistant_open_vendors", "assistant_ask"]);

/** Always speed the voiceover up by this much (project rule: Lexi/First Look Voice +10%). */
export const VO_SPEED = 1.1;
export const FPS = 30;
export const CTA_WORDS = /comment\s+[“"]?look[”"]?/i;

export type CardItem = { label: string; sub: string; correct: boolean };

export type Visual =
  | { type: "text"; highlight: string[] }
  | { type: "cards"; title: string; items: CardItem[]; numbered: boolean; shuffle: boolean }
  | { type: "footage"; need: string; clip_id: string | null; upload_path: string | null; trim_start: number; caption: string }
  | { type: "pause"; seconds: number }
  | { type: "ask"; pill: string; chips: string[] }
  | { type: "cta"; outcome: string };

export const VISUAL_TYPES = ["text", "cards", "footage", "pause", "ask", "cta"] as const;

export type Segment = { id: string; text: string; visual: Visual };

export function emptyVisual(type: Visual["type"]): Visual {
  switch (type) {
    case "text":
      return { type, highlight: [] };
    case "cards":
      return { type, title: "", items: [], numbered: false, shuffle: false };
    case "footage":
      return { type, need: "", clip_id: null, upload_path: null, trim_start: 0, caption: "" };
    case "pause":
      return { type, seconds: 4 };
    case "ask":
      return { type, pill: "Comment below", chips: [] };
    case "cta":
      return { type, outcome: "" };
  }
}

/** Clean up model or form output into a safe Segment[] (never throws). */
export function normalizeSegments(raw: unknown): Segment[] {
  if (!Array.isArray(raw)) return [];
  const out: Segment[] = [];
  raw.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const e = entry as Record<string, unknown>;
    const v = (e.visual && typeof e.visual === "object" ? e.visual : {}) as Record<string, unknown>;
    const type = VISUAL_TYPES.includes(v.type as Visual["type"]) ? (v.type as Visual["type"]) : "text";
    const str = (x: unknown) => (typeof x === "string" ? x.trim() : "");
    const strs = (x: unknown) => (Array.isArray(x) ? x.map(str).filter(Boolean) : []);
    const num = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) ? x : d);
    let visual: Visual;
    switch (type) {
      case "cards":
        visual = {
          type,
          title: str(v.title),
          items: (Array.isArray(v.items) ? v.items : [])
            .map((it) => {
              const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
              return { label: str(o.label), sub: str(o.sub), correct: o.correct === true };
            })
            .filter((it) => it.label)
            .slice(0, 7),
          numbered: v.numbered === true,
          shuffle: v.shuffle === true,
        };
        break;
      case "footage":
        visual = {
          type,
          need: str(v.need),
          clip_id: str(v.clip_id) || null,
          upload_path: str(v.upload_path) || null,
          trim_start: Math.max(0, num(v.trim_start, 0)),
          caption: str(v.caption),
        };
        break;
      case "pause":
        visual = { type, seconds: Math.min(8, Math.max(1, num(v.seconds, 4))) };
        break;
      case "ask":
        visual = { type, pill: str(v.pill) || "Comment below", chips: strs(v.chips).slice(0, 4) };
        break;
      case "cta":
        visual = { type, outcome: str(v.outcome) };
        break;
      default:
        visual = { type: "text", highlight: strs(v.highlight).slice(0, 6) };
    }
    const text = type === "pause" ? "" : str(e.text).replace(/\s+/g, " ");
    out.push({ id: str(e.id) || `s${index + 1}`, text, visual });
  });
  // unique ids
  const seen = new Set<string>();
  return out.map((s, i) => {
    let id = s.id;
    while (seen.has(id)) id = `${s.id}-${i}`;
    seen.add(id);
    return { ...s, id };
  });
}

/** The exact text sent to ElevenLabs: spoken segments joined by a space. */
export function voiceText(segments: readonly Segment[]): string {
  return segments
    .filter((s) => s.visual.type !== "pause" && s.text)
    .map((s) => s.text)
    .join(" ");
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// ---------------------------------------------------------------------------
// Alignment: ElevenLabs gives per-character times; map them to words per segment.
// ---------------------------------------------------------------------------

export type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type AlignedWord = { w: string; s: number; e: number };
export type AlignedSegment = { id: string; start: number; end: number; words: AlignedWord[] };
export type VoiceAlignment = { duration: number; segments: AlignedSegment[] };

/**
 * `text` is voiceText(segments). Words are split on whitespace; each word takes
 * the start of its first character and the end of its last. A segment owns the
 * words that fall inside its character range.
 */
export function alignSegments(segments: readonly Segment[], alignment: Alignment): VoiceAlignment {
  const text = voiceText(segments);
  const chars = alignment.characters;
  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  const n = Math.min(chars.length, starts.length, ends.length);
  const duration = n ? (ends[n - 1] as number) : 0;
  // The API aligns the text it was sent; if text normalisation changed the length, rescale indexes.
  const scale = text.length > 0 && n !== text.length ? n / text.length : 1;
  const at = (i: number) => Math.max(0, Math.min(n - 1, Math.round(i * scale)));

  const spoken = segments.filter((s) => s.visual.type !== "pause" && s.text);
  const result: AlignedSegment[] = [];
  let cursor = 0;
  for (const seg of spoken) {
    const from = cursor;
    const to = from + seg.text.length; // exclusive
    cursor = to + 1; // joining space
    const words: AlignedWord[] = [];
    const re = /\S+/g;
    const slice = text.slice(from, to);
    let m: RegExpExecArray | null;
    while ((m = re.exec(slice))) {
      if (n === 0) continue;
      const a = at(from + m.index);
      const b = at(from + m.index + m[0].length - 1);
      words.push({ w: m[0], s: starts[a] as number, e: ends[b] as number });
    }
    if (!words.length) continue;
    result.push({ id: seg.id, start: (words[0] as AlignedWord).s, end: (words[words.length - 1] as AlignedWord).e, words });
  }
  return { duration, segments: result };
}

// ---------------------------------------------------------------------------
// Final timeline
// ---------------------------------------------------------------------------

export type Pause = { at: number; seconds: number };

export type TimelineBeat = {
  id: string;
  start: number;
  end: number;
  words: AlignedWord[];
  visual: Visual;
  text: string;
};

export type Timeline = {
  beats: TimelineBeat[];
  /** Silences to splice into the sped-up voiceover: `at` is in sped-up (pre-pause) seconds. */
  pauses: Pause[];
  duration: number;
};

const round3 = (x: number) => Math.round(x * 1000) / 1000;

/**
 * Walk the script in order. Spoken segments take their aligned times / speed.
 * A pause segment adds silence right after the previous spoken segment ends:
 * everything after it shifts later by `seconds`. A segment lasts until the next
 * one starts (so visuals cross-fade without gaps); the last holds for `hold`s.
 */
export function buildTimeline(
  segments: readonly Segment[],
  aligned: VoiceAlignment,
  opts: { speed?: number; hold?: number } = {},
): Timeline {
  const speed = opts.speed ?? VO_SPEED;
  const hold = opts.hold ?? 1.2;
  const byId = new Map(aligned.segments.map((a) => [a.id, a]));
  const beats: TimelineBeat[] = [];
  const pauses: Pause[] = [];
  let shift = 0;
  let lastEnd = 0;

  for (const seg of segments) {
    if (seg.visual.type === "pause") {
      const at = lastEnd; // sped-up, pre-pause seconds
      pauses.push({ at: round3(at), seconds: seg.visual.seconds });
      beats.push({ id: seg.id, start: round3(at + shift), end: round3(at + shift + seg.visual.seconds), words: [], visual: seg.visual, text: "" });
      shift += seg.visual.seconds;
      continue;
    }
    const a = byId.get(seg.id);
    if (!a) continue;
    const words = a.words.map((w) => ({ w: w.w, s: round3(w.s / speed + shift), e: round3(w.e / speed + shift) }));
    const start = round3(a.start / speed + shift);
    const end = round3(a.end / speed + shift);
    beats.push({ id: seg.id, start, end, words, visual: seg.visual, text: seg.text });
    lastEnd = a.end / speed;
  }

  // a beat lasts until the next begins
  for (let i = 0; i < beats.length; i += 1) {
    const next = beats[i + 1];
    const cur = beats[i] as TimelineBeat;
    if (next && cur.visual.type !== "pause") cur.end = Math.max(cur.end, round3(next.start));
  }
  const last = beats[beats.length - 1];
  const duration = round3((last ? last.end : 0) + hold);
  if (last) last.end = duration;
  return { beats, pauses, duration };
}

// ---------------------------------------------------------------------------
// Footage status
// ---------------------------------------------------------------------------

export type FootageNeed = { segmentId: string; need: string; satisfied: boolean; source: "library" | "upload" | null };

export function footageNeeds(segments: readonly Segment[]): FootageNeed[] {
  return segments.flatMap((s) =>
    s.visual.type === "footage"
      ? [
          {
            segmentId: s.id,
            need: s.visual.need,
            satisfied: Boolean(s.visual.clip_id || s.visual.upload_path),
            source: s.visual.clip_id ? ("library" as const) : s.visual.upload_path ? ("upload" as const) : null,
          },
        ]
      : [],
  );
}

/** Rough keyword score so an uploaded library item can be suggested for a need. */
export function footageScore(need: string, item: { title: string; description: string; tags: string[]; feature: string }, feature?: string): number {
  const words = (s: string) => s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  const stop = new Set(["the", "and", "for", "with", "that", "this", "your", "from", "screen", "recording", "showing", "shows"]);
  const want = new Set(words(need).filter((w) => !stop.has(w)));
  if (!want.size) return 0;
  const have = new Set(words(`${item.title} ${item.description} ${item.tags.join(" ")}`));
  let hits = 0;
  for (const w of want) if (have.has(w)) hits += 1;
  return hits / want.size + (feature && item.feature === feature ? 0.25 : 0);
}

// ---------------------------------------------------------------------------
// Copy rules
// ---------------------------------------------------------------------------

export type VideoCopy = {
  kind: "tip" | "engage" | "promo";
  mechanic: string;
  feature: string;
  title: string;
  caption: string;
  pinned_comment: string;
  segments: readonly Segment[];
};

export const MIN_WORDS = 40;
export const MAX_WORDS = 135;

function visualText(v: Visual): string {
  switch (v.type) {
    case "cards":
      return [v.title, ...v.items.flatMap((i) => [i.label, i.sub])].join(" ");
    case "footage":
      return v.caption;
    case "ask":
      return [v.pill, ...v.chips].join(" ");
    case "cta":
      return v.outcome;
    default:
      return "";
  }
}

export function checkVideoCopy(p: VideoCopy): string[] {
  const issues: string[] = [];
  const spoken = voiceText(p.segments);
  const all = [p.title, p.caption, p.pinned_comment, spoken, ...p.segments.map((s) => visualText(s.visual))].join("\n");
    const words = wordCount(spoken);

  if (!p.segments.length) issues.push("script has no segments");
  if (words < MIN_WORDS || words > MAX_WORDS) issues.push(`spoken script is ${words} words; aim for 90-120`);
  if (AI_WORD.test(all)) issues.push('mentions "AI"; say assistant or automatically');
  if (MADE_UP_STATS.test(all)) issues.push("states a statistic or average that cannot be sourced");
  if (TESTIMONIAL.test(all)) issues.push("implies a testimonial or customer quote");
  if (ASSISTANT_FEATURES.has(p.feature) && PRICING_CLAIM.test(all)) {
    issues.push("claims the assistant returns pricing or fits a budget (it drafts requests for pricing; it does not pull prices)");
  }
  if (/\b(I'll|I will|I'm|I am|my wedding|we planned|our wedding)\b/i.test(spoken)) {
    issues.push("first person; the voice cannot claim personal experience");
  }
  if ((spoken.match(FIRST_LOOK) ?? []).length > 1) issues.push("names First Look more than once in the voiceover");
  const last = p.segments[p.segments.length - 1];
  if (p.kind === "engage") {
    if (!p.segments.some((s) => s.visual.type === "ask")) issues.push("engagement video needs an ask segment");
    if (last && last.visual.type === "cta") issues.push("engagement videos end on their own ask, not the Look outro (one ask per post)");
    if (!/comment/i.test(p.caption)) issues.push("engagement caption must ask for a comment");
    if (!p.pinned_comment.trim()) issues.push("engagement video needs a pinned comment");
  } else {
    if (!last || last.visual.type !== "cta") issues.push('tip/promo videos must end with the "Look" CTA outro segment');
    else {
      if (!CTA_WORDS.test(last.text)) issues.push('final spoken line must be: Comment "Look" to get free access to the app that will <outcome>');
      if (/first\s?look/i.test(last.text)) issues.push("the CTA must not name First Look");
      if (!last.visual.outcome) issues.push("cta segment needs the outcome text shown on screen");
    }
  }
  if (p.segments.some((s) => s.visual.type === "footage" && !s.visual.need && !s.visual.clip_id && !s.visual.upload_path)) {
    issues.push("footage segment needs a description of what the screen should show");
  }
  if (!p.title.trim()) issues.push("missing title");
  return issues;
}
