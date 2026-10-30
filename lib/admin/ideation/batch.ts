import "server-only";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clampCarouselSlides,
  DEFAULT_CAROUSEL_SLIDES,
  formatNeedsImages,
  formatsForPlatform,
  isContentPostFormat,
  type ContentPostFormat,
} from "@/lib/admin/content-formats";
import {
  isActiveContentQueuePlatform,
  type ContentQueuePlatform,
} from "@/lib/admin/content-queue";
import {
  pickLeastRecentTopics,
  repeatsShownCopy,
  retiredClaimPromptBlock,
  shownCopyPromptBlock,
} from "@/lib/admin/content-angles";
import {
  loadContentHistory,
  SHOWN_COPY_PROMPT_LIMIT,
} from "@/lib/admin/content-history";
import {
  isPostStyle,
  POST_STYLE_META,
  POST_STYLES,
  stylePromptBlock,
  type PostStyle,
} from "@/lib/admin/content-styles";
import {
  TOPIC_DECKS,
  type ContentTopic,
  type TopicDeckId,
} from "@/lib/admin/content-topics";
import { lockedAudienceForPlatform } from "@/lib/admin/platform-audience";
import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";

/** Ideas per click. The founders pick a couple from these. */
export const IDEA_BATCH_SIZE = 10;
export const SIGNAL_MAX_CHARS = 4000;

const COUPLE_DECKS: TopicDeckId[] = ["couples_tip", "couples_list", "couples_promo"];
const VENUE_DECKS: TopicDeckId[] = ["venue_promo", "venue_tip"];
const PROMO_DECKS: TopicDeckId[] = ["couples_promo", "venue_promo"];

const SYSTEM_PROMPT = `You brainstorm social posts for First Look, a wedding-planning SaaS.
The founders tell you what has been getting the most engagement. Your job is to find the
FORMAT behind it and reuse that format on new topics. Copy the structure, never the words.

How to read what's working:
- Name the pattern in your head: how slide 1 or the first line opens, who it calls out,
  what question it leaves open, how long it is, what the post type is.
- Example of a pattern: a cover that calls out a specific audience and promises the one
  thing they must not miss ("First month engaged? Here's what actually can't wait.").
  The pattern is "audience callout + open loop about what matters first". It can be reused
  on budgets, vendors, guests, or timelines. The exact sentence can never be reused.
- Most ideas should follow a winning pattern. A couple may try something adjacent so the
  founders can find the next winner.

Two audiences only:
- Couples, for TikTok slideshows and Pinterest pins.
- Venues and planners, for LinkedIn. The reader is always the venue or planner. Never write
  a couples tip for LinkedIn.

Tone: warm, useful, a little funny, never salesy. Never use the word "AI".
The hook must stand on its own and still be useful if the product were removed.
Stay inside what First Look already does. Never recommend another app, a spreadsheet,
Google or Apple calendar, Notion, a paper chart, a group text, or a system the viewer has to build.

Couple behaviors the product covers: a due date and reminder on each budget line, budget categories, a dated checklist, the guest list and RSVPs, vendor search, the seating chart, the day-of timeline, the wedding website, the calendar, notes and files, the overview, the assistant.
Venue and planner behaviors: inquiries on a board, follow-up automations, the book of weddings, white-label branding, proposals that become contracts, invoices, date holds on the calendar, inviting the couple into that wedding, and the couple then working there.

Post styles you may choose from (pick the one that fits each idea and the winning pattern):
${stylePromptBlock()}

For each idea return:
- topic_key: one of the topic keys you were given. Use each topic at most once.
- post_style: one of the styles above.
- format: one of the formats allowed for this platform (given in the request).
- carousel_slides: slide count for a carousel (3 to 7). Use 0 for any other format.
- hook: the cover line or first line, one or two sentences. Written for the audience.
- format_note: one sentence telling the copywriter how to open and structure the post so it
  follows the winning pattern (for example: "Slide 1 calls out the audience and promises the
  one thing that can't wait; later slides give the order."). No product name in it.

Return ONLY the JSON shape you are given. No markdown, no extra keys.`;

export type BatchIdea = {
  id: string;
  batch_id: string;
  idea_text: string;
  comment: string;
  platform: ContentQueuePlatform;
  format: ContentPostFormat;
  audience_group: "couples" | "planner";
  carousel_slides: number | null;
  intent: "tip" | "promo";
  post_style: PostStyle;
  topic_key: string;
};

type RawIdea = {
  topic_key: string;
  post_style: PostStyle;
  format: ContentPostFormat;
  carousel_slides: number;
  hook: string;
  format_note: string;
};

function imageFormatsFor(platform: ContentQueuePlatform): ContentPostFormat[] {
  return formatsForPlatform(platform)
    .map((f) => f.key)
    .filter((key) => formatNeedsImages(key));
}

function defaultFormatFor(platform: ContentQueuePlatform): ContentPostFormat {
  return imageFormatsFor(platform)[0] ?? "static";
}

function topicPool(platform: ContentQueuePlatform): {
  topics: ContentTopic[];
  promoKeys: Set<string>;
} {
  const decks = platform === "linkedin" ? VENUE_DECKS : COUPLE_DECKS;
  const seen = new Set<string>();
  const topics: ContentTopic[] = [];
  const promoKeys = new Set<string>();
  for (const deck of decks) {
    for (const topic of TOPIC_DECKS[deck]) {
      if (PROMO_DECKS.includes(deck)) promoKeys.add(topic.key);
      if (seen.has(topic.key)) continue;
      seen.add(topic.key);
      topics.push(topic);
    }
  }
  return { topics, promoKeys };
}

function ideaSchema(platform: ContentQueuePlatform) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["ideas"],
    properties: {
      ideas: {
        type: "array",
        minItems: 1,
        description: `Exactly ${IDEA_BATCH_SIZE} ideas.`,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["topic_key", "post_style", "format", "carousel_slides", "hook", "format_note"],
          properties: {
            topic_key: { type: "string" },
            post_style: { type: "string", enum: [...POST_STYLES] },
            format: { type: "string", enum: imageFormatsFor(platform) },
            carousel_slides: { type: "integer" },
            hook: { type: "string" },
            format_note: { type: "string" },
          },
        },
      },
    },
  };
}

function readRawIdeas(
  value: unknown,
  platform: ContentQueuePlatform,
  topics: ContentTopic[],
): RawIdea[] {
  if (!isRecord(value) || !Array.isArray(value.ideas)) return [];
  const allowedFormats = imageFormatsFor(platform);
  const validKeys = new Set(topics.map((t) => t.key));
  const usedKeys = new Set<string>();
  const out: RawIdea[] = [];
  for (const item of value.ideas) {
    if (!isRecord(item)) continue;
    const hook = typeof item.hook === "string" ? item.hook.trim() : "";
    if (!hook) continue;
    const rawKey = typeof item.topic_key === "string" ? item.topic_key : "";
    let topic_key = validKeys.has(rawKey) ? rawKey : "";
    if (topic_key && usedKeys.has(topic_key)) topic_key = "";
    if (!topic_key) {
      topic_key = topics.find((t) => !usedKeys.has(t.key))?.key ?? topics[0]!.key;
    }
    usedKeys.add(topic_key);
    const style = isPostStyle(item.post_style) && item.post_style !== "tip" ? item.post_style : "numbered";
    const format = isContentPostFormat(item.format as string) && allowedFormats.includes(item.format as ContentPostFormat)
      ? (item.format as ContentPostFormat)
      : defaultFormatFor(platform);
    const slides = typeof item.carousel_slides === "number" ? item.carousel_slides : DEFAULT_CAROUSEL_SLIDES;
    out.push({
      topic_key,
      post_style: style,
      format,
      carousel_slides: format === "carousel" ? clampCarouselSlides(slides || DEFAULT_CAROUSEL_SLIDES) : 0,
      hook,
      format_note: typeof item.format_note === "string" ? item.format_note.trim() : "",
    });
    if (out.length >= IDEA_BATCH_SIZE) break;
  }
  return out;
}

async function tasteBlock(supabase: SupabaseClient, shown: string[]): Promise<string> {
  const { data: disliked } = await supabase
    .from("ideation_items")
    .select("idea_text, comment")
    .eq("rating", "down")
    .order("created_at", { ascending: false })
    .limit(6);
  const lines: string[] = [retiredClaimPromptBlock()];
  const shownBlock = shownCopyPromptBlock(shown.slice(0, SHOWN_COPY_PROMPT_LIMIT));
  if (shownBlock) lines.push(shownBlock);
  if (disliked?.length) {
    lines.push("Ideas the team has passed (avoid this pattern):");
    for (const row of disliked) {
      lines.push(`- "${row.idea_text}"${row.comment ? ` — note: ${row.comment}` : ""}`);
    }
  }
  return lines.join("\n");
}

/** Rewrite hooks that repeat shown copy, keeping topic, style, format and the winning pattern. */
async function rewriteRepeats(
  ideas: RawIdea[],
  shown: string[],
  signal: string,
  topics: ContentTopic[],
): Promise<void> {
  const prior = [...shown];
  const redo: number[] = [];
  ideas.forEach((idea, index) => {
    if (repeatsShownCopy(idea.hook, prior)) redo.push(index);
    else prior.push(idea.hook);
  });
  if (redo.length === 0) return;

  try {
    const parsed = await callClaudeJson({
      system: SYSTEM_PROMPT,
      user: `These hooks repeat something already shown. Rewrite each one with different words, keeping the same topic, style, format and the same winning pattern.

What the founders say is working:
${signal || "(nothing provided)"}

${retiredClaimPromptBlock()}
${shownCopyPromptBlock(prior)}

${redo
  .map((i, n) => {
    const idea = ideas[i]!;
    const topic = topics.find((t) => t.key === idea.topic_key);
    return `${n + 1}. topic=${topic?.label ?? idea.topic_key} style=${idea.post_style} (${POST_STYLE_META[idea.post_style].label})
   Rejected hook: ${JSON.stringify(idea.hook)}`;
  })
  .join("\n")}`,
      maxTokens: 2048,
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["hooks"],
        properties: { hooks: { type: "array", minItems: 1, items: { type: "string" } } },
      },
    });
    const hooks = isRecord(parsed) && Array.isArray(parsed.hooks)
      ? parsed.hooks.filter((h): h is string => typeof h === "string" && h.trim().length > 0)
      : [];
    redo.forEach((ideaIndex, n) => {
      const next = hooks[n]?.trim();
      if (next) ideas[ideaIndex]!.hook = next;
    });
  } catch (err) {
    console.warn("ideation-batch rewrite:", err);
  }
}

export async function generateIdeaBatch(
  supabase: SupabaseClient,
  args: {
    platform: ContentQueuePlatform;
    signal: string;
    requestedBy: string | null;
  },
): Promise<BatchIdea[]> {
  if (!process.env.MODEL_API_KEY?.trim()) {
    throw new Error("MODEL_API_KEY is not configured.");
  }
  if (!isActiveContentQueuePlatform(args.platform)) {
    throw new Error("Pick TikTok, Pinterest, or LinkedIn.");
  }
  const audience = lockedAudienceForPlatform(args.platform);
  if (!audience) throw new Error("Pick TikTok, Pinterest, or LinkedIn.");

  const signal = args.signal.trim().slice(0, SIGNAL_MAX_CHARS);
  const history = await loadContentHistory(supabase);
  const { topics: pool, promoKeys } = topicPool(args.platform);
  const offered = pickLeastRecentTopics(
    pool,
    Math.min(pool.length, IDEA_BATCH_SIZE + 4),
    new Set<string>(),
    history.recentTopicKeys,
  );
  const formats = imageFormatsFor(args.platform);
  const taste = await tasteBlock(supabase, history.shownTexts);

  const user = `Platform: ${args.platform}. Audience: ${audience === "planner" ? "venues and planners" : "couples"}.
Allowed formats for this platform: ${formats.join(", ")}.
Write exactly ${IDEA_BATCH_SIZE} ideas. Use a different topic for each, chosen from this list (least recently used first):
${offered.map((t) => `- ${t.key}: ${t.label} — ${t.brief}`).join("\n")}

What the founders say is working right now:
${signal || "(nothing provided — mix several proven post shapes)"}

${taste}`;

  const parsed = await callClaudeJson({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 6144,
    jsonSchema: ideaSchema(args.platform),
  });
  const ideas = readRawIdeas(parsed, args.platform, offered.length > 0 ? offered : pool);
  if (ideas.length === 0) throw new Error("The model returned no usable ideas. Try again.");

  await rewriteRepeats(ideas, history.shownTexts, signal, offered.length > 0 ? offered : pool);

  const batchId = randomUUID();
  const rows = ideas.map((idea) => {
    const metaBuckets = POST_STYLE_META[idea.post_style].buckets;
    const wantsPromo = idea.post_style === "promo" || promoKeys.has(idea.topic_key);
    const intent: "tip" | "promo" = wantsPromo ? "promo" : "tip";
    return {
      idea_text: idea.hook,
      comment: idea.format_note || null,
      requested_by: args.requestedBy,
      platform: args.platform,
      format: idea.format,
      audience_group: audience,
      carousel_slides: idea.format === "carousel" ? idea.carousel_slides : null,
      intent: metaBuckets.includes(intent) ? intent : (metaBuckets[0] ?? "tip"),
      post_style: idea.post_style,
      topic_key: idea.topic_key,
      batch_id: batchId,
    };
  });

  const { data, error } = await supabase.from("ideation_items").insert(rows).select("id");
  if (error) throw new Error(error.message);

  return rows.map((row, index) => ({
    id: (data?.[index]?.id as string) ?? "",
    batch_id: batchId,
    idea_text: row.idea_text,
    comment: row.comment ?? "",
    platform: row.platform,
    format: row.format,
    audience_group: row.audience_group,
    carousel_slides: row.carousel_slides,
    intent: row.intent as "tip" | "promo",
    post_style: row.post_style,
    topic_key: row.topic_key,
  }));
}
