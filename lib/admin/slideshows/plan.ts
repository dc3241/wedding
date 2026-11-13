import "server-only";

import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";
import {
  parseSlideFragment,
  type SlideFragment,
  type SlideSpec,
  type SlideTheme,
} from "@/lib/admin/content-queue/slide-spec";
import { FEATURE_FACTS, GLOBAL_RULES, LAYOUT_GUIDE, MECHANIC_PLAYBOOK, playbookFor } from "./angles";
import {
  FEATURES,
  MECHANICS,
  MECHANIC_BY_KEY,
  angleKey,
  checkPostCopy,
  isAllowedCombo,
  utmCampaign,
  type CopyPost,
  type PostKind,
  type Slot,
} from "./logic";

/** Layouts the slideshow generator may use. headline-phone needs a product screen, so it is left out. */
export const SLIDESHOW_LAYOUTS = [
  "headline-card",
  "tip-list",
  "steps",
  "before-after",
  "statement",
  "big-number",
  "ask",
] as const;

export type GenerationContext = {
  /** Recent post titles, newest first, so the model does not repeat a hook. */
  recentTitles: string[];
  /** Plain-language notes on what is working and what is not. */
  performanceNotes: string;
  /** Dom's standing direction from weekly summary replies. */
  direction: string[];
};

export type GeneratedPost = {
  kind: PostKind;
  mechanic: string;
  feature: string;
  angle_key: string;
  topic: string;
  title: string;
  caption: string;
  pinned_comment: string;
  hook: string;
  utm_campaign: string;
  slide_specs: SlideSpec[];
  custom_brief: string | null;
};

const slideDataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["tabs", "rows", "value", "before", "after", "beforeTitle", "afterTitle", "tips", "steps", "highlight", "pill", "chips"],
  properties: {
    tabs: { type: "array", items: { type: "string" } },
    rows: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "status", "tone"],
        properties: {
          label: { type: "string" },
          status: { type: "string" },
          tone: { type: "string", enum: ["good", "warn", "bad", "neutral"] },
        },
      },
    },
    value: { type: "string" },
    before: { type: "array", items: { type: "string" } },
    after: { type: "array", items: { type: "string" } },
    beforeTitle: { type: "string" },
    afterTitle: { type: "string" },
    tips: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "body"],
        properties: { title: { type: "string" }, body: { type: "string" } },
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "caption"],
        properties: { word: { type: "string" }, caption: { type: "string" } },
      },
    },
    highlight: { type: "string" },
    pill: { type: "string" },
    chips: { type: "array", items: { type: "string" } },
  },
} as const;

function postJsonSchema(custom: boolean) {
  const properties: Record<string, unknown> = {
    topic: { type: "string", description: "A few words naming what this post is about." },
    title: { type: "string", description: "Post title, at most 90 characters." },
    caption: { type: "string", description: "TikTok caption: hook, the ask, then 5-6 hashtags." },
    pinned_comment: { type: "string", description: "The comment the founder pins first." },
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["headline", "support", "layout", "cta", "data"],
        properties: {
          headline: { type: "string" },
          support: { type: "string" },
          layout: { type: "string", enum: [...SLIDESHOW_LAYOUTS] },
          cta: { type: "boolean", description: "True only on a soft-close slide that shows the app button." },
          data: slideDataSchema,
        },
      },
    },
  };
  const required = ["topic", "title", "caption", "pinned_comment", "slides"];
  if (custom) {
    properties.mechanic = { type: "string", enum: MECHANICS.map((m) => m.key) };
    properties.feature = { type: "string", enum: FEATURES.map((f) => f.key) };
    required.push("mechanic", "feature");
  }
  return { type: "object", additionalProperties: false, required, properties };
}

const SYSTEM_PROMPT = `You write one TikTok photo slideshow post for First Look, a wedding-planning app for couples.
You are strategic: each post has a clear mechanic that is designed to earn comments, or it is a genuinely useful tip.

${GLOBAL_RULES}

${LAYOUT_GUIDE}

Caption format: one or two short lines that hook, then the ask (engagement posts ask for the specific comment), then 5 to 6 hashtags. Emoji allowed in the caption. Never include a URL in an engagement caption.
Return exactly one object.`;

function contextBlock(ctx: GenerationContext): string {
  const parts: string[] = [];
  if (ctx.performanceNotes.trim()) parts.push(`What is working and not working (from logged results):\n${ctx.performanceNotes.trim()}`);
  if (ctx.direction.length) parts.push(`Direction from the founder (follow it):\n${ctx.direction.map((d) => `- ${d}`).join("\n")}`);
  if (ctx.recentTitles.length) {
    parts.push(`Recent titles. Do not reuse these hooks or topics:\n${ctx.recentTitles.slice(0, 40).map((t) => `- ${t}`).join("\n")}`);
  }
  return parts.join("\n\n");
}

function slideText(fragment: SlideFragment): string {
  const d = fragment.data as {
    rows?: { label?: string; status?: string }[];
    tips?: { title?: string; body?: string }[];
    steps?: { word?: string; caption?: string }[];
    before?: string[];
    after?: string[];
    beforeTitle?: string;
    afterTitle?: string;
    pill?: string;
    chips?: string[];
    value?: string;
    tabs?: string[];
  };
  return [
    fragment.headline,
    fragment.support,
    ...(d.rows ?? []).flatMap((r) => [r.label ?? "", r.status ?? ""]),
    ...(d.tips ?? []).flatMap((t) => [t.title ?? "", t.body ?? ""]),
    ...(d.steps ?? []).flatMap((s) => [s.word ?? "", s.caption ?? ""]),
    ...(d.before ?? []),
    ...(d.after ?? []),
    d.beforeTitle ?? "",
    d.afterTitle ?? "",
    d.pill ?? "",
    ...(d.chips ?? []),
    d.value ?? "",
    ...(d.tabs ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function textHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Themes, chosen in code so a batch does not look uniform. The hook slide is
 * dark, blush, or rose; middle slides alternate blush and white; answers sit
 * on sage; the ask slide is rose (dark when the hook is already rose).
 */
export function assignThemes(layouts: readonly string[], texts: readonly string[], seed: string): SlideTheme[] {
  const hooks: SlideTheme[] = ["ink", "blush", "rose"];
  const hook = hooks[textHash(seed) % hooks.length] ?? "ink";
  return layouts.map((layout, i) => {
    if (i === 0) return hook;
    if (layout === "ask") return hook === "rose" ? "ink" : "rose";
    const text = (texts[i] ?? "").toLowerCase();
    if (/\banswers?\b|\bthe fix\b|\bfixes\b/.test(text.slice(0, 80))) return "sage";
    return i % 2 === 1 ? "blush" : "white";
  });
}

type RawPost = {
  topic: string;
  title: string;
  caption: string;
  pinned_comment: string;
  slides: unknown[];
  mechanic?: string;
  feature?: string;
};

function parseRaw(value: unknown): RawPost | null {
  if (!isRecord(value)) return null;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (!Array.isArray(value.slides)) return null;
  return {
    topic: str(value.topic),
    title: str(value.title).slice(0, 90),
    caption: str(value.caption),
    pinned_comment: str(value.pinned_comment),
    slides: value.slides,
    mechanic: str(value.mechanic) || undefined,
    feature: str(value.feature) || undefined,
  };
}

function assemble(
  raw: RawPost,
  slot: { kind: PostKind; mechanic: string; feature: string },
  customBrief: string | null,
): { post: GeneratedPost | null; issues: string[] } {
  const issues: string[] = [];
  const fragments: SlideFragment[] = raw.slides.map((slide, i) => parseSlideFragment(slide, `Slide ${i + 1}`));
  // A slide whose layout data did not validate has already fallen back to a plain
  // statement slide with its headline and support intact, so it is still usable.
  // Only reject the post when most of the slides fell back (the model ignored the layouts).
  const degradedCount = fragments.filter((f) => f.degraded).length;
  if (degradedCount > Math.floor(fragments.length / 2)) {
    issues.push("most slides had layout data that did not match their layout; fill only the data fields the chosen layout uses");
  }
  const ctaFlags = raw.slides.map((s) => (isRecord(s) && s.cta === true ? true : false));
  const copy: CopyPost = {
    kind: slot.kind,
    mechanic: slot.mechanic,
    feature: slot.feature,
    title: raw.title,
    caption: raw.caption,
    pinned_comment: raw.pinned_comment,
    slides: fragments.map((f) => ({ layout: f.layout, headline: f.headline, support: f.support, text: slideText(f) })),
  };
  issues.push(...checkPostCopy(copy));
  const last = fragments.length - 1;
  if (slot.kind === "tip" && last >= 0 && !ctaFlags[last]) issues.push("tip must end on a soft-close slide with cta true");
  if (fragments.some((f) => f.layout === "ask") && ctaFlags[fragments.findIndex((f) => f.layout === "ask")]) {
    issues.push("the ask slide cannot carry the app button");
  }
  if (issues.length) return { post: null, issues };

  const layouts = fragments.map((f) => f.layout);
  const themes = assignThemes(layouts, fragments.map(slideText), raw.title);
  const specs: SlideSpec[] = fragments.map((f, i) => ({
    format: "tiktok",
    layout: f.layout,
    theme: themes[i] ?? "blush",
    headline: f.headline,
    support: f.support || undefined,
    cta: ctaFlags[i] === true && f.layout !== "ask",
    data: f.data,
  }));
  return {
    post: {
      kind: slot.kind,
      mechanic: slot.mechanic,
      feature: slot.feature,
      angle_key: angleKey(slot.feature, slot.mechanic),
      topic: raw.topic || raw.title,
      title: raw.title,
      caption: raw.caption,
      pinned_comment: raw.pinned_comment,
      hook: fragments[0]?.headline ?? raw.title,
      utm_campaign: utmCampaign(slot.mechanic, slot.feature),
      slide_specs: specs,
      custom_brief: customBrief,
    },
    issues: [],
  };
}

export type GenerateResult = { ok: true; post: GeneratedPost } | { ok: false; issues: string[] };

/** One post for a planned slot. Retries (up to 3 tries) with the rule violations spelled out. */
export async function generatePost(slot: Slot, ctx: GenerationContext): Promise<GenerateResult> {
  const base = `${playbookFor(slot.mechanic, slot.feature)}\n\n${contextBlock(ctx)}`;
  let issues: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prompt = issues.length
      ? `${base}\n\nYour previous attempt broke these rules. Fix every one:\n${issues.map((i) => `- ${i}`).join("\n")}`
      : base;
    try {
      const raw = parseRaw(
        await callClaudeJson({
          system: SYSTEM_PROMPT,
          user: prompt,
          maxTokens: 4000,
          jsonSchema: postJsonSchema(false),
        }),
      );
      if (!raw) {
        issues = ["response was not a post object"];
        continue;
      }
      const out = assemble(raw, slot, null);
      if (out.post) return { ok: true, post: out.post };
      issues = out.issues;
    } catch (err) {
      issues = [err instanceof Error ? err.message : "generation failed"];
    }
  }
  return { ok: false, issues };
}

/**
 * Custom post: Dom describes the angle in plain language. The model picks the
 * closest mechanic and feature from the allowed lists (so it still gets the
 * right slide structure and the honest product facts), then writes the post.
 */
export async function generateCustomPost(brief: string, ctx: GenerationContext): Promise<GenerateResult> {
  const guide = MECHANICS.map((m) => `- ${m.key} (${m.kind}): ${m.label}`).join("\n");
  const features = FEATURES.map((f) => `- ${f.key}: ${f.label}`).join("\n");
  const playbooks = MECHANICS.map((m) => `## ${m.key} (${m.slides[0]}-${m.slides[1]} slides)\n${MECHANIC_PLAYBOOK[m.key] ?? ""}`).join("\n\n");
  const facts = FEATURES.map((f) => `- ${f.key}: ${FEATURE_FACTS[f.key] ?? ""}`).join("\n");
  const base = `The founder wants this post. Follow the idea as written; do not swap it for a different one:\n"""\n${brief.trim()}\n"""\n\nChoose the mechanic and feature that fit the idea best.\nMechanics:\n${guide}\nFeatures:\n${features}\n\nPlaybooks by mechanic:\n${playbooks}\n\nFeature facts (the only product claims you may make):\n${facts}\n\nComment-to-run only fits the assistant features. If no mechanic fits, use "tip" or "story_ask".\n\n${contextBlock(ctx)}`;
  let issues: string[] = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prompt = issues.length
      ? `${base}\n\nYour previous attempt broke these rules. Fix every one:\n${issues.map((i) => `- ${i}`).join("\n")}`
      : base;
    try {
      const raw = parseRaw(
        await callClaudeJson({ system: SYSTEM_PROMPT, user: prompt, maxTokens: 4000, jsonSchema: postJsonSchema(true) }),
      );
      if (!raw) {
        issues = ["response was not a post object"];
        continue;
      }
      const mechanic = raw.mechanic ?? "tip";
      const feature = raw.feature ?? "none";
      if (!isAllowedCombo(feature, mechanic)) {
        issues = [`${mechanic} cannot use ${feature}; pick a combination that is allowed`];
        continue;
      }
      const kind = MECHANIC_BY_KEY.get(mechanic)?.kind ?? "tip";
      const out = assemble(raw, { kind, mechanic, feature }, brief.trim());
      if (out.post) return { ok: true, post: out.post };
      issues = out.issues;
    } catch (err) {
      issues = [err instanceof Error ? err.message : "generation failed"];
    }
  }
  return { ok: false, issues };
}
