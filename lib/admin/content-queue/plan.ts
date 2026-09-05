import "server-only";

import { adminToday } from "@/lib/admin/today";
import type { ContentQueuePlatform } from "@/lib/admin/content-queue";
import type { ContentType } from "@/lib/admin/platforms";
import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";

export const CONTENT_PILLARS = [
  "Budgeting",
  "Timeline",
  "Guests",
  "Vendors",
  "Planner/venue ops",
  "Real-wedding walkthroughs",
] as const;

export type ContentPillar = (typeof CONTENT_PILLARS)[number];

export const CONTENT_QUEUE_PLATFORMS_CYCLE: ContentQueuePlatform[] = [
  "instagram",
  "tiktok",
  "pinterest",
];

/** Default weekly batch — 12 hits the mockup sample and splits 4 per platform. */
export const DEFAULT_BATCH_SIZE = 12;

export type PlannedPost = {
  platform: ContentQueuePlatform;
  pillar: ContentPillar;
  content_type: ContentType;
  topic: string;
  caption: string;
  prompt: string;
};

type PlannedSlot = {
  platform: ContentQueuePlatform;
  pillar: ContentPillar;
  content_type: ContentType;
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

function allocateTypes(n: number): ContentType[] {
  const dCount = Math.max(1, Math.round(n * 0.1));
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

export function allocateSlots(batchSize = DEFAULT_BATCH_SIZE): PlannedSlot[] {
  const n = Math.min(Math.max(batchSize, 9), 12);
  const types = allocateTypes(n);
  return types.map((content_type, i) => ({
    platform: CONTENT_QUEUE_PLATFORMS_CYCLE[i % CONTENT_QUEUE_PLATFORMS_CYCLE.length]!,
    pillar: CONTENT_PILLARS[i % CONTENT_PILLARS.length]!,
    content_type,
  }));
}

const SYSTEM_PROMPT = `You write the weekly social batch for First Look, a wedding-planning
SaaS for couples and for planners/venues. Tone: warm, useful, a little funny, never salesy.
You are filling copy for a FIXED list of slots — do not change platform, pillar, or content type.

Content types:
- A: pure tip. No product mention.
- B: story. No product mention.
- C: story with a soft, one-line product mention.
- D: direct promo of First Look. Still specific, never generic SaaS-speak.

For each slot return:
- topic: one line, the post's subject.
- caption: platform-appropriate post text (TikTok on-screen/spoken-style caption, Instagram caption, Pinterest pin description).
- prompt: an image-generation prompt for a branded slide. Keep the locked template's layout, type, and palette. Describe only what changes (headline, supporting lines, any small scene). The prompt MUST include the tags [pillar: …] and [type: A|B|C|D] using the slot's exact pillar and type.

Return ONLY strict JSON:
{"posts":[{"topic":"","caption":"","prompt":""}, ...]}
One object per slot, same order. No markdown fences.`;

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function buildWeekPlan(
  batchSize = DEFAULT_BATCH_SIZE,
): Promise<PlannedPost[]> {
  const slots = allocateSlots(batchSize);

  const user = `Fill copy for these ${slots.length} slots, in this exact order:\n${slots
    .map(
      (slot, i) =>
        `${i + 1}. platform=${slot.platform} pillar=${slot.pillar} type=${slot.content_type}`,
    )
    .join("\n")}`;

  const parsed = await callClaudeJson({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 8192,
  });

  if (!isRecord(parsed)) {
    throw new Error("Anthropic returned no weekly content plan.");
  }
  const posts = parsed.posts;
  if (!Array.isArray(posts)) {
    throw new Error("Anthropic returned no weekly content plan.");
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
    const prompt = asNonEmptyString(row.prompt);
    if (!topic || !caption || !prompt) {
      throw new Error(`Anthropic plan item ${i + 1} is missing topic, caption, or prompt.`);
    }
    const tagged =
      prompt.includes(`[pillar: ${slot.pillar}]`) &&
      prompt.includes(`[type: ${slot.content_type}]`)
        ? prompt
        : `${prompt.trim()} [pillar: ${slot.pillar}] [type: ${slot.content_type}]`;
    return {
      ...slot,
      topic,
      caption,
      prompt: tagged,
    };
  });
}
