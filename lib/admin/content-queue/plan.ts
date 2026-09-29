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
import {
  SLIDE_LAYOUTS,
  slidesFromModel,
  type SlideFragment,
} from "@/lib/admin/content-queue/slide-spec";
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
  /** Week shortlist. Tips stay pure value; promos name the product. */
  intent?: "tip" | "promo" | null;
};

export type PlannedPost = {
  sourceIdeaId: string;
  platform: ContentQueuePlatform;
  /** Short label stored on content_queue.pillar for the review card. */
  pillar: string;
  content_type: ContentType;
  topic: string;
  caption: string;
  /** First headline, for the review card. Empty for UGC and text. */
  prompt: string;
  /** One headline per slide. Empty for UGC and text. */
  prompts: string[];
  /** Validated spec fragments. Theme, format, and final layout are chosen later. */
  fragments: SlideFragment[];
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
You are filling copy for APPROVED ideas the founders already liked. Do not invent a
different topic. Do not change platform, format, or audience. If a tip tells them
to build an outside calendar or spreadsheet, keep the lesson and drop the outside tool.

Content types (caption flavor only — not the production format):
- A: pure tip with no product. Only when the idea has no tip/promo intent.
- B: story. No product mention.
- C: tip. The words never name First Look, "the app", or a product. The picture can.
- D: direct promo. You may name First Look. Still specific, never generic SaaS-speak.

Never tell the viewer to build or switch to a spreadsheet, external calendar, Notion, paper chart, group text, or another app.

Layouts (pick one per slide; code may override):
${SLIDE_LAYOUTS.join(", ")}.
- headline-card: a short list with a status on each row.
- headline-phone: a product screen. Use only with a surface slug.
- big-number: one stat. Put the stat in data.value (for example "17 days"). The headline is the caption under the number.
- before-after: contrast. data.before and data.after are short lines.
- tip-list: numbered advice. data.tips have title and body.
- steps: a process, at most 4. data.steps have a one-word word and a caption.
- statement: text only. data.highlight is a short phrase that appears inside the headline, or "".

For a type C slideshow, slides 1 through N-1 are headline tips with surface "none". The last slide keeps the same kind of headline and uses one surface slug so the real screen shows up. For a type C pin, the single slide uses that slug and the headline still does not name the product. Type D may name the product and uses a surface slug on the plug slide. Type A and B use surface "none".

When surface is a slug, leave every data array empty and every data string "". The app fills the real product UI. Do not invent screen copy, names, or numbers.

Production formats:
- static / pin: exactly one slide.
- carousel: exactly N slides, a sequence. Slide 1 is a cover (statement or big-number).
- ugc: film-it-yourself video. Caption is the spoken / on-screen script. slides MUST be [].
- text: LinkedIn copy-only post. Caption is the post body. slides MUST be [].
- carousel on TikTok is a photo slideshow, vertical, same slide rules as carousel.

TikTok videos and Pinterest pins are also posted to Facebook. YouTube is a repost of the
same TikTok video — do not write a YouTube variant. LinkedIn is its own text post.

For each slot return:
- topic: one short label (a few words) for the review card.
- caption: platform-appropriate post text that executes THIS idea.
  For UGC this is the script (TikTok) or the post body (LinkedIn video). For text
  this is the full post.
- slides: the array described above. Each slide has headline, support (or ""),
  layout, surface (a slug or "none"), and data.
  Headlines are at most 90 characters. Supporting lines are one sentence.
  Surface slugs, exactly one of: ${PRODUCT_SHOT_SLUGS.join(", ")}.
  For budget, pick budget (paid-so-far tracker), budget-categories
  (where the money goes), or budget-item (one line, its deposit, or the due date).
  A deposit reminder tip uses budget-item.

Return exactly one object per slot, same order — no extra variants. Never use the word "AI".`;

const slideDataSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "tabs",
    "rows",
    "value",
    "before",
    "after",
    "beforeTitle",
    "afterTitle",
    "tips",
    "steps",
    "highlight",
  ],
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
        properties: {
          title: { type: "string" },
          body: { type: "string" },
        },
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["word", "caption"],
        properties: {
          word: { type: "string" },
          caption: { type: "string" },
        },
      },
    },
    highlight: { type: "string" },
  },
} as const;

function weeklyPlanJsonSchema(count: number) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["posts"],
    properties: {
      posts: {
        type: "array",
        minItems: 1,
        description: `Exactly ${count} post(s), one per approved idea, same order as the prompt. No extra variants.`,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["topic", "caption", "slides"],
          properties: {
            topic: { type: "string", description: "Short review-card label." },
            caption: { type: "string", description: "Platform post text or UGC/text-post body." },
            slides: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["headline", "support", "layout", "surface", "data"],
                properties: {
                  headline: { type: "string" },
                  support: { type: "string" },
                  layout: { type: "string", enum: [...SLIDE_LAYOUTS] },
                  surface: {
                    type: "string",
                    enum: ["none", ...PRODUCT_SHOT_SLUGS],
                  },
                  data: slideDataSchema,
                },
              },
            },
          },
        },
      },
    },
  };
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function contentTypeForIntent(
  intent: LikedIdeaSlot["intent"],
  fallback: ContentType,
): ContentType {
  if (intent === "tip") return "C";
  if (intent === "promo") return "D";
  return fallback;
}

function promptLine(fragment: SlideFragment): string {
  return fragment.support ? `${fragment.headline}\n${fragment.support}` : fragment.headline;
}

type Slot = LikedIdeaSlot & { content_type: ContentType; slides: number };

function materialize(parsed: unknown, slots: Slot[]): (PlannedPost & { degraded: boolean })[] {
  if (!isRecord(parsed)) {
    const kind = Array.isArray(parsed) ? "array" : typeof parsed;
    throw new Error(`Anthropic weekly plan was not an object (got ${kind}).`);
  }
  const rawPosts = parsed.posts;
  if (!Array.isArray(rawPosts)) {
    const keys = Object.keys(parsed).join(", ") || "none";
    throw new Error(`Anthropic weekly plan missing posts array (keys: ${keys}).`);
  }
  if (rawPosts.length < slots.length) {
    throw new Error(
      `Anthropic plan length mismatch: expected ${slots.length}, got ${rawPosts.length}.`,
    );
  }
  if (rawPosts.length > slots.length) {
    console.warn(
      `Anthropic plan returned ${rawPosts.length} posts for ${slots.length} slot(s); using the first ${slots.length}.`,
    );
  }
  const posts = rawPosts.slice(0, slots.length);

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
    const count = needsImages ? slot.slides : 0;
    const { fragments, degraded } = slidesFromModel(row.slides, count, topic);
    const prompts = fragments.map(promptLine);

    return {
      sourceIdeaId: slot.id,
      platform: slot.platform,
      pillar: topic,
      content_type: slot.content_type,
      topic,
      caption,
      prompt: prompts[0] ?? "",
      prompts,
      fragments,
      degraded,
      format: slot.format,
      audience_group: slot.audience_group,
      carousel_slides:
        slot.format === "carousel"
          ? clampCarouselSlides(slot.carousel_slides ?? slot.slides)
          : null,
    };
  });
}

async function requestPlan(slots: Slot[]): Promise<unknown> {
  const user = `Fill copy for these ${slots.length} approved ideas, in this exact order.
Return exactly ${slots.length} object(s) in "posts" — one per idea, no extras, no variants.\n${slots
    .map((slot, i) => {
      const note = slot.comment ? ` note=${JSON.stringify(slot.comment)}` : "";
      const slides = slot.format === "carousel" ? ` slides=${slot.slides}` : "";
      return `${i + 1}. platform=${slot.platform} format=${slot.format}${slides} audience=${slot.audience_group} type=${slot.content_type} idea=${JSON.stringify(slot.idea_text)}${note}`;
    })
    .join("\n")}`;

  return callClaudeJson({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 12288,
    jsonSchema: weeklyPlanJsonSchema(slots.length),
  });
}

export async function buildWeekPlan(ideas: LikedIdeaSlot[]): Promise<PlannedPost[]> {
  if (ideas.length === 0) return [];

  const types = allocateTypes(ideas.length);
  const slots: Slot[] = ideas.map((idea, i) => ({
    ...idea,
    content_type: contentTypeForIntent(idea.intent, types[i] ?? "A"),
    slides: slideCountFor(idea.format, idea.carousel_slides),
  }));

  let posts: (PlannedPost & { degraded: boolean })[] | null = null;
  try {
    posts = materialize(await requestPlan(slots), slots);
  } catch (err) {
    console.warn("content-queue plan retry:", err);
  }

  if (!posts || posts.some((post) => post.degraded)) {
    try {
      posts = materialize(await requestPlan(slots), slots);
    } catch (err) {
      if (!posts) throw err;
      console.warn("content-queue plan retry failed; using the first pass.", err);
    }
  }

  return posts.map(({ degraded: _degraded, ...post }) => post);
}
