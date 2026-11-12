import "server-only";

import { callClaudeJson } from "@/lib/inquiry/llm-json";
import { FEATURE_FACTS, GLOBAL_RULES } from "@/lib/admin/slideshows/angles";
import {
  FEATURE_BY_KEY,
  MECHANIC_BY_KEY,
  type Slot,
} from "@/lib/admin/slideshows/logic";
import { checkVideoCopy, normalizeSegments, type Segment } from "./script";
import type { VideoFootage } from "./types";

export type VideoContext = {
  recentTitles: string[];
  direction: string[];
};

export type VideoIdea = {
  slot: Slot;
  title: string;
  hook: string;
  concept: string;
};

export type VideoScript = {
  segments: Segment[];
  caption: string;
  pinned_comment: string;
};

// ---------------------------------------------------------------------------
// Ideas: one call, one idea per planned slot
// ---------------------------------------------------------------------------

const IDEAS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slot", "title", "hook", "concept"],
        properties: {
          slot: { type: "integer", description: "The slot number this idea is for." },
          title: { type: "string", description: "Working title, at most 80 characters." },
          hook: { type: "string", description: "The first spoken line, one sentence." },
          concept: { type: "string", description: "Two sentences: what the video shows and says, and what the viewer does at the end." },
        },
      },
    },
  },
} as const;

const VIDEO_MECHANIC_NOTES: Record<string, string> = {
  tip: "Pure tip: one piece of specific, usable advice for a situation. Ends with the Look CTA.",
  promo: "Feature promo: pain, what the feature does, how a couple uses it, using only the feature facts. Ends with the Look CTA.",
  quiz: "Quiz: show a flawed planning artifact with a fixed number of mistakes (usually 3), pause so viewers can look, then reveal. Ends on 'comment your score'.",
  vote: "Hot take: a mildly divisive wedding spending or etiquette choice with two fair sides. Ends on 'comment 1 or 2'.",
  ranking: "Rank these: five wedding items the viewer ranks. Never state a correct order or costs. Ends on 'comment your ranking'.",
  myth_truth: "Myth or truth: a common belief about planning, with honest context. Ends on 'comment myth or truth'.",
  story_ask: "Scenario: a relatable dilemma with up to three options. No resolution that sells the app. Ends on 'comment what you'd do'.",
  comment_to_run: "Comment to run: the viewer comments a few details and we run it through the in-app assistant and reply with the real result. Needs real screen footage of the assistant.",
};

export async function generateVideoIdeas(slots: readonly Slot[], ctx: VideoContext): Promise<VideoIdea[]> {
  const lines = slots.map((s, i) => {
    const m = MECHANIC_BY_KEY.get(s.mechanic);
    const f = FEATURE_BY_KEY.get(s.feature);
    return `Slot ${i + 1}: ${s.kind.toUpperCase()} · ${m?.label ?? s.mechanic} · feature: ${f?.label ?? s.feature}\n  Mechanic: ${VIDEO_MECHANIC_NOTES[s.mechanic] ?? ""}\n  Feature facts: ${FEATURE_FACTS[s.feature] ?? FEATURE_FACTS.none}`;
  });
  const parts = [
    `Give one short-video IDEA for each slot below. Ideas only: no script yet.`,
    `Each idea must be different in topic and hook from the others and from the recent titles. Keep to the slot's mechanic and feature.`,
    lines.join("\n\n"),
  ];
  if (ctx.direction.length) parts.push(`Direction from the founder (follow it):\n${ctx.direction.map((d) => `- ${d}`).join("\n")}`);
  if (ctx.recentTitles.length) parts.push(`Recent titles, do not repeat:\n${ctx.recentTitles.slice(0, 40).map((t) => `- ${t}`).join("\n")}`);
  const out = (await callClaudeJson({
    system: `You plan 30-45 second TikTok videos for First Look, a wedding-planning app for couples. A voiceover reads over motion graphics and sometimes a real screen recording of the app.\n\n${GLOBAL_RULES}`,
    user: parts.join("\n\n"),
    maxTokens: 3000,
    jsonSchema: IDEAS_SCHEMA,
  })) as { ideas?: { slot?: number; title?: string; hook?: string; concept?: string }[] };

  const result: VideoIdea[] = [];
  for (const idea of out.ideas ?? []) {
    const slot = slots[(idea.slot ?? 0) - 1];
    if (!slot || !idea.title?.trim()) continue;
    if (result.some((r) => r.slot === slot)) continue;
    result.push({ slot, title: idea.title.trim().slice(0, 120), hook: (idea.hook ?? "").trim(), concept: (idea.concept ?? "").trim() });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Script: segments of spoken text + a visual, caption, pinned comment
// ---------------------------------------------------------------------------

const visualSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "highlight", "title", "items", "numbered", "shuffle", "need", "clip_id", "trim_start", "caption", "seconds", "pill", "chips", "outcome"],
  properties: {
    type: { type: "string", enum: ["text", "cards", "footage", "pause", "ask", "cta"] },
    highlight: { type: "array", items: { type: "string" } },
    title: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "sub", "correct"],
        properties: { label: { type: "string" }, sub: { type: "string" }, correct: { type: "boolean" } },
      },
    },
    numbered: { type: "boolean" },
    shuffle: { type: "boolean" },
    need: { type: "string" },
    clip_id: { type: "string" },
    trim_start: { type: "number" },
    caption: { type: "string" },
    seconds: { type: "number" },
    pill: { type: "string" },
    chips: { type: "array", items: { type: "string" } },
    outcome: { type: "string" },
  },
} as const;

const SCRIPT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["caption", "pinned_comment", "segments"],
  properties: {
    caption: { type: "string", description: "TikTok caption: hook, the ask, then 5-6 hashtags." },
    pinned_comment: { type: "string" },
    segments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "visual"],
        properties: { text: { type: "string", description: "Exactly what the voice says. Empty only for pause." }, visual: visualSchema },
      },
    },
  },
} as const;

const SCRIPT_SYSTEM = `You write one 35-45 second TikTok video script for First Look, a wedding-planning app for couples.
The script is an ordered list of SEGMENTS. Each segment is one spoken idea (1-2 short sentences) plus the VISUAL shown while it is spoken. The voiceover reads all spoken text in one take, and every visual is timed to the exact words, so write the text exactly as it should be heard.

${GLOBAL_RULES}

Voice rules: third person or about the product, never first person ("I", "my wedding") because the voice is synthetic. Plain wording. Only commas and periods: no ellipses, no exclamation marks, no emoji, no audio tags, no parentheses. About 95-115 spoken words in total including the final ask or CTA (the voice speaks about 2.8 words a second after the speed-up). Spell numbers the way they are spoken when short ("three mistakes"), keep real figures like 6:48 PM as written.

Visual types (fill the fields for the chosen type; leave the others empty: "" / [] / false / 0):
- text: the spoken words appear as animated text. highlight = 1-3 key words from the text to color. Use for hooks and statements.
- cards: a stack of cards that pop in as each is mentioned. title (short heading), items (2-6 of {label, sub, correct}); numbered true for rankings/lists; shuffle true only for ranking videos (cards swap places while viewers think); correct true marks an answer or mistake that gets a check. Each label should contain a word that is spoken in that segment's text so it pops at the right moment.
- footage: a real screen recording of the app in a phone-style card. need = what the screen should show (always fill, concrete). clip_id = the id of a library clip that matches, or "" if none matches. trim_start 0. caption = a short overlay line like "Draft ready for your review", only describing what is really on screen. Never use footage for something the app does not do.
- pause: silence with a countdown ring while viewers look (quiz videos). text must be "". seconds 3-5.
- ask: the final comment prompt for engagement videos. pill = the button text (e.g. "Comment your score"), chips = up to 4 short chips (e.g. "0","1","2","3" or the inputs to comment). The spoken text is the question that leads to it.
- cta: the final segment of tip and promo videos ONLY. text must be exactly: Comment "Look" to get free access to the app that will <outcome tied to this video's topic>. outcome = the same outcome clause (e.g. "keep your budget in check"). Do not name First Look in it.

Structure: first segment is a hook (text). Engagement videos END on an ask segment (no cta; one ask per post). Tip and promo videos END on a cta segment, preceded by an optional soft close that may name First Look once.
Caption: one or two short lines that hook, then the ask, then 5-6 hashtags. Engagement captions ask for the specific comment. Pinned comment: for engagement, what to comment (quiz: put the full answers here); for tips, a one-line follow-up.
Return one object.`;

export type FootageBrief = Pick<VideoFootage, "id" | "title" | "description" | "feature" | "media_type" | "duration_sec">;

export type ScriptResult = { ok: true; script: VideoScript } | { ok: false; issues: string[] };

type RawScript = {
  caption?: string;
  pinned_comment?: string;
  segments?: unknown;
};

function toSegments(raw: unknown, footageIds: Set<string>): Segment[] {
  const withIds = (Array.isArray(raw) ? raw : []).map((s, i) => ({ ...(s as object), id: `s${i + 1}` }));
  return normalizeSegments(withIds).map((seg) => {
    if (seg.visual.type === "footage" && seg.visual.clip_id && !footageIds.has(seg.visual.clip_id)) {
      return { ...seg, visual: { ...seg.visual, clip_id: null } };
    }
    return seg;
  });
}

export async function generateVideoScript(
  idea: { kind: Slot["kind"]; mechanic: string; feature: string; title: string; hook: string; concept: string },
  ctx: VideoContext,
  library: readonly FootageBrief[],
): Promise<ScriptResult> {
  const lib = library.length
    ? library.map((f) => `- id ${f.id}: ${f.title} (${f.media_type}${f.duration_sec ? `, ${f.duration_sec}s` : ""}, feature ${f.feature}) ${f.description}`).join("\n")
    : "(empty: no footage uploaded yet)";
  const base = [
    `Video idea: ${idea.title}`,
    `Hook: ${idea.hook}`,
    `Concept: ${idea.concept}`,
    `Type: ${idea.kind.toUpperCase()} · mechanic ${idea.mechanic}. ${VIDEO_MECHANIC_NOTES[idea.mechanic] ?? ""}`,
    `Feature: ${FEATURE_BY_KEY.get(idea.feature)?.label ?? idea.feature}. Feature facts (the only product claims you may make): ${FEATURE_FACTS[idea.feature] ?? FEATURE_FACTS.none}`,
    `Footage library (reuse a clip whenever one fits what the screen should show; otherwise leave clip_id empty and describe the need):\n${lib}`,
    ctx.direction.length ? `Direction from the founder (follow it):\n${ctx.direction.map((d) => `- ${d}`).join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const footageIds = new Set(library.map((f) => f.id));
  let issues: string[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt = issues.length ? `${base}\n\nYour previous attempt broke these rules. Fix every one:\n${issues.map((i) => `- ${i}`).join("\n")}` : base;
    try {
      const raw = (await callClaudeJson({ system: SCRIPT_SYSTEM, user: prompt, maxTokens: 5000, jsonSchema: SCRIPT_SCHEMA })) as RawScript;
      const segments = toSegments(raw.segments, footageIds);
      const script: VideoScript = { segments, caption: (raw.caption ?? "").trim(), pinned_comment: (raw.pinned_comment ?? "").trim() };
      issues = checkVideoCopy({
        kind: idea.kind,
        mechanic: idea.mechanic,
        feature: idea.feature,
        title: idea.title,
        caption: script.caption,
        pinned_comment: script.pinned_comment,
        segments,
      });
      if (!issues.length) return { ok: true, script };
    } catch (err) {
      issues = [err instanceof Error ? err.message : "script generation failed"];
    }
  }
  return { ok: false, issues };
}
