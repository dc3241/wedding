import "server-only";

import {
  clampCarouselSlides,
  formatNeedsImages,
  slideCountFor,
  type ContentPostFormat,
} from "@/lib/admin/content-formats";
import type { ContentQueuePlatform } from "@/lib/admin/content-queue";
import type { AudienceGroup } from "@/lib/admin/platform-audience";
import type { ContentType } from "@/lib/admin/platforms";
import { PRODUCT_SHOT_SLUGS } from "@/lib/admin/content-queue/product-shots";
import { adminToday } from "@/lib/admin/today";
import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";

/** Cap for one Friday batch — matches the old 12-slot week. */
export const DEFAULT_BATCH_SIZE = 12;

export type LikedIdeaSlot = {
  id: string;
  idea_text: string;
  comment: string | null;
  platform: ContentQueuePlatform;
  format: ContentPostFormat;
  audience_group: AudienceGroup;
  carousel_slides: number | null;
};

export type PlannedPost = {
  sourceIdeaId: string;
  platform: ContentQueuePlatform;
  /** Short label stored on content_queue.pillar for the review card. */
  pillar: string;
  content_type: ContentType;
  topic: string;
  caption: string;
  /** First (or only) image prompt; empty for UGC. */
  prompt: string;
  /** One prompt per KIE job. Empty for UGC. */
  prompts: string[];
  format: ContentPostFormat;
  audience_group: AudienceGroup;
  carousel_slides: number | null;
};

/**
 * Monday on or after `today` (YYYY-MM-DD, already a Phoenix calendar date).
 * Friday's batch plans the week that is about to start.
 */
export function contentQueueWeekOf(today = adminToday()): string {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dow = date.getUTCDay();
  const daysUntilMonday = dow === 1 ? 0 : dow === 0 ? 1 : 8 - dow;
  date.setUTCDate(date.getUTCDate() + daysUntilMonday);
  return date.toISOString().slice(0, 10);
}

export function allocateTypes(n: number): ContentType[] {
  if (n <= 0) return [];
  const dCount = n >= 8 ? Math.max(1, Math.round(n * 0.1)) : 0;
  const cCount = Math.round(n * 0.2);
  const bCount = Math.round(n * 0.2);
  const aCount = Math.max(0, n - bCount - cCount - dCount);
  const bags: ContentType[][] = [
    Array.from({ length: aCount }, () => "A"),
    Array.from({ length: bCount }, () => "B"),
    Array.from({ length: cCount }, () => "C"),
    Array.from({ length: dCount }, () => "D"),
  ];
  const out: ContentType[] = [];
  while (out.length < n) {
    let progressed = false;
    for (const bag of bags) {
      const next = bag.shift();
      if (next) {
        out.push(next);
        progressed = true;
        if (out.length === n) break;
      }
    }
    if (!progressed) break;
  }
  return out;
}

const SYSTEM_PROMPT = `You write the weekly social batch for First Look, a wedding-planning
SaaS for couples and for planners/venues. Tone: warm, useful, a little funny, never salesy.
You are filling copy for APPROVED ideas the founders already liked. Do not change the
idea's angle. Do not invent a different topic. Do not change platform, format, or audience.

Content types (caption flavor only — not the production format):
- A: pure tip. No product mention.
- B: story. No product mention.
- C: story with a soft, one-line product mention.
- D: direct promo of First Look. Still specific, never generic SaaS-speak.

Production formats:
- static / photo / pin: one branded-slide image. Put that prompt in "prompt".
- carousel: N branded slides, same locked template, a sequence. Put slide prompts in
  "prompts" (length N) AND set "prompt" to the first slide.
- ugc: film-it-yourself. Caption is the spoken / on-screen script. "prompt" MUST be "".
- text: LinkedIn (or other) copy-only post. Caption is the post body. "prompt" MUST be "".

For each slot return:
- topic: one short label (a few words) for the review card.
- caption: platform-appropriate post text (TikTok on-screen/spoken-style caption,
  Instagram caption, Pinterest pin description, LinkedIn post) that executes THIS idea.
  For UGC this is the script. For text this is the full post.
- prompt: image-generation prompt for a branded slide, or "" for UGC and text.
  Headline + one supporting line only. Never describe screens, dashboards, portals,
  buttons, logos, helper text, chrome, serif type, script type, device frames, or
  invented UI — a real screenshot is attached separately as a fragment source, and
  describing a full screenshot makes the model paste one. When the idea shows the
  product, add [surface: SLUG] using exactly one of:
  ${PRODUCT_SHOT_SLUGS.join(", ")}. Lifestyle or tip posts with no UI omit [surface:].
  Image-format prompts MUST include the tags [idea: …] and [type: A|B|C|D] using the
  slot's topic label and type.
- prompts: for carousel only, an array of N image prompts (one per slide), each tagged
  the same way. Empty array for other formats.

Return one object per slot, same order. Never use the word "AI".`;

/** Constrained decoding — same ONB-07 shape as generate-wedding-plan. */
const WEEKLY_PLAN_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["posts"],
  properties: {
    posts: {
      type: "array",
      minItems: 1,
      description: "One post per approved idea, same order as the prompt.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "caption", "prompt", "prompts"],
        properties: {
          topic: {
            type: "string",
            description: "Short review-card label.",
          },
          caption: {
            type: "string",
            description: "Platform post text or UGC/text-post body.",
          },
          prompt: {
            type: "string",
            description: "Image prompt, or empty string for UGC and text.",
          },
          prompts: {
            type: "array",
            items: { type: "string" },
            description: "Carousel slide prompts; empty for other formats.",
          },
        },
      },
    },
  },
};

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function tagPrompt(prompt: string, topic: string, type: ContentType): string {
  return prompt.includes(`[idea: ${topic}]`) && prompt.includes(`[type: ${type}]`)
    ? prompt
    : `${prompt.trim()} [idea: ${topic}] [type: ${type}]`;
}

function asPromptList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function expandCarouselPrompts(
  base: string,
  n: number,
  topic: string,
  type: ContentType,
): string[] {
  return Array.from({ length: n }, (_, i) =>
    tagPrompt(
      `${base} Carousel slide ${i + 1} of ${n} — same locked template, continue the sequence.`,
      topic,
      type,
    ),
  );
}

export async function buildWeekPlan(ideas: LikedIdeaSlot[]): Promise<PlannedPost[]> {
  if (ideas.length === 0) return [];

  const types = allocateTypes(ideas.length);
  const slots = ideas.map((idea, i) => ({
    ...idea,
    content_type: types[i] ?? ("A" as ContentType),
    slides: slideCountFor(idea.format, idea.carousel_slides),
  }));

  const user = `Fill copy for these ${slots.length} approved ideas, in this exact order:\n${slots
    .map((slot, i) => {
      const note = slot.comment ? ` note=${JSON.stringify(slot.comment)}` : "";
      const slides =
        slot.format === "carousel" ? ` slides=${slot.slides}` : "";
      return `${i + 1}. platform=${slot.platform} format=${slot.format}${slides} audience=${slot.audience_group} type=${slot.content_type} idea=${JSON.stringify(slot.idea_text)}${note}`;
    })
    .join("\n")}`;

  const parsed = await callClaudeJson({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 12288,
    jsonSchema: WEEKLY_PLAN_JSON_SCHEMA,
  });

  if (!isRecord(parsed)) {
    const kind = Array.isArray(parsed) ? "array" : typeof parsed;
    throw new Error(`Anthropic weekly plan was not an object (got ${kind}).`);
  }
  const posts = parsed.posts;
  if (!Array.isArray(posts)) {
    const keys = Object.keys(parsed).join(", ") || "none";
    throw new Error(`Anthropic weekly plan missing posts array (keys: ${keys}).`);
  }
  if (posts.length !== slots.length) {
    throw new Error(
      `Anthropic plan length mismatch: expected ${slots.length}, got ${posts.length}.`,
    );
  }

  return slots.map((slot, i) => {
    const row = posts[i];
    if (!isRecord(row)) {
      throw new Error(`Anthropic plan item ${i + 1} is not an object.`);
    }
    const topic = asNonEmptyString(row.topic);
    const caption = asNonEmptyString(row.caption);
    if (!topic || !caption) {
      throw new Error(`Anthropic plan item ${i + 1} is missing topic or caption.`);
    }

    const needsImages = formatNeedsImages(slot.format);
    const rawPrompt = asNonEmptyString(row.prompt) ?? "";
    const listed = asPromptList(row.prompts);

    let prompts: string[] = [];
    let prompt = "";

    if (!needsImages) {
      prompt = "";
      prompts = [];
    } else if (slot.format === "carousel") {
      const n = slot.slides;
      if (listed.length === n) {
        prompts = listed.map((p) => tagPrompt(p, topic, slot.content_type));
      } else if (rawPrompt) {
        prompts = expandCarouselPrompts(rawPrompt, n, topic, slot.content_type);
      } else if (listed.length > 0) {
        const base = listed[0]!;
        prompts = expandCarouselPrompts(base, n, topic, slot.content_type);
      } else {
        throw new Error(`Anthropic plan item ${i + 1} is missing carousel prompts.`);
      }
      prompt = prompts[0] ?? "";
    } else {
      if (!rawPrompt) {
        throw new Error(`Anthropic plan item ${i + 1} is missing an image prompt.`);
      }
      prompt = tagPrompt(rawPrompt, topic, slot.content_type);
      prompts = [prompt];
    }

    return {
      sourceIdeaId: slot.id,
      platform: slot.platform,
      pillar: topic,
      content_type: slot.content_type,
      topic,
      caption,
      prompt,
      prompts,
      format: slot.format,
      audience_group: slot.audience_group,
      carousel_slides:
        slot.format === "carousel"
          ? clampCarouselSlides(slot.carousel_slides ?? slot.slides)
          : null,
    };
  });
}
