import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { callClaudeJson, isRecord } from "@/lib/inquiry/llm-json";
import {
  CONTENT_LANES,
  formatDayHeading,
  laneProduction,
  postingDates,
  postingWeekMonday,
  slideshowSecond,
  type ContentIntent,
  type ContentLane,
} from "@/lib/admin/content-week";
import {
  isCoupleListTopic,
  TOPIC_DECKS,
  type ContentTopic,
  type TopicDeckId,
} from "@/lib/admin/content-topics";
import { ensureWeekSlots } from "@/lib/admin/content-week/load";

const IDEAS_PER_INTENT = 3;

const SYSTEM_PROMPT = `You brainstorm short-form social ideas for First Look, a wedding-planning
SaaS. Two audiences only:
- Couples, for TikTok slideshows and Pinterest pins.
- Venues and planners, for LinkedIn posts that each get one square image. LinkedIn is always a promo. The reader is the venue or planner. Never write a couples tip, and never write industry advice that leaves the product out.

Tone: warm, useful, a little funny, never salesy. Never use the word "AI".

Both tips and promos stay inside what First Look already does. Never recommend another app, spreadsheet, Google or Apple calendar, Notion, a paper chart, a group text, or a system the viewer has to build.

Couple behaviors the product already covers: a due date and reminder on each budget line, budget categories, a dated checklist, the guest list and RSVPs, vendor search, the seating chart, the day-of timeline, the wedding website, the calendar (tastings, fittings, deadlines, payments), notes and files, the overview, the assistant.
Venue and planner behaviors: inquiries on a board, follow-up automations, the book of weddings, white-label branding, proposals that become contracts, invoices in the couple's wedding, date holds on the calendar, inviting the couple into that wedding, and the couple then working there — checklist, budget, guest list and RSVPs, seating, wedding website, day-of timeline, and the venue or planner's vendor library.

Tip: write it the way a person would say it. Do not mention First Look, "the app", or a product name. The advice itself is the behavior above, not a tool they should go create. Good: "Most couples mark a deposit paid or not paid and miss that a vendor can cancel if you're a few days late — give every due date a reminder buffer." Bad: "Here's how to build a deposit calendar." Bad: "Open First Look and add a reminder."
Promo: you may name First Look. Open on the pain, then the feature. A promo slideshow ends on the feature.
List: a cover plus five separate pieces of advice. Every item is real advice. Mention First Look once, inside the item the brief marks, as a light aside — never the cover, never every slide. A real product screen belongs on any advice slide the brief names a screen for. Name that screen in the idea. Do not save the product for a final pitch slide.

Slideshow and pin tips and promos are one or two sentences. A list idea is a short paragraph: the cover line, the five items, the screen for each item that has one, and the single First Look mention.
LinkedIn ideas are one or two sentences a headline can carry. Name First Look. Open on the pain, then how the product handles it for a venue or planner. When the topic is the couple working in the book, the post is still to the venue or planner: what the couple does stays in their wedding, under their brand.

Return ONLY the JSON shape you are given. No markdown, no extra keys.`;

export type GenerateWeekResult = {
  weekStart: string;
  daysGenerated: string[];
  daysSkipped: string[];
  errors: string[];
};

type DayTopics = {
  slideshow: { tip: ContentTopic; promo: ContentTopic };
  pin: { tip: ContentTopic; promo: ContentTopic };
  linkedin: { intent: ContentIntent; topic: ContentTopic };
};

function threeStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
  if (out.length < IDEAS_PER_INTENT) return null;
  return out.slice(0, IDEAS_PER_INTENT);
}

/** Anthropic structured output only allows minItems 0 or 1, and no maxItems. */
function ideaListSchema() {
  return {
    type: "array",
    minItems: 1,
    description: "Exactly 3 distinct ideas.",
    items: { type: "string" },
  };
}

function pairSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["tip", "promo"],
    properties: { tip: ideaListSchema(), promo: ideaListSchema() },
  };
}

async function tasteLines(supabase: SupabaseClient): Promise<string> {
  const [{ data: liked }, { data: disliked }, { data: used }] = await Promise.all([
    supabase
      .from("ideation_items")
      .select("idea_text, comment")
      .eq("rating", "up")
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("ideation_items")
      .select("idea_text, comment")
      .eq("rating", "down")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("ideation_items")
      .select("idea_text")
      .not("used_at", "is", null)
      .order("used_at", { ascending: false })
      .limit(20),
  ]);

  const lines: string[] = [];
  if (liked?.length) {
    lines.push("Ideas the team has liked (lean this way):");
    for (const row of liked) {
      lines.push(`- "${row.idea_text}"${row.comment ? ` — note: ${row.comment}` : ""}`);
    }
  }
  if (disliked?.length) {
    lines.push("Ideas the team has passed (avoid this pattern):");
    for (const row of disliked) {
      lines.push(`- "${row.idea_text}"${row.comment ? ` — note: ${row.comment}` : ""}`);
    }
  }
  if (used?.length) {
    lines.push("Already produced — do not repeat or lightly rephrase:");
    for (const row of used) lines.push(`- "${row.idea_text}"`);
  }
  return lines.join("\n");
}

async function takeTopics(
  supabase: SupabaseClient,
  deck: TopicDeckId,
  count: number,
): Promise<{ start: number; topics: ContentTopic[] }> {
  const list = TOPIC_DECKS[deck];
  const { data, error } = await supabase
    .from("content_topic_cursors")
    .select("next_index")
    .eq("deck", deck)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const start = data?.next_index ?? 0;
  const { error: writeError } = await supabase
    .from("content_topic_cursors")
    .upsert({ deck, next_index: start + count });
  if (writeError) throw new Error(writeError.message);
  const topics = Array.from({ length: count }, (_, i) => list[(start + i) % list.length]!);
  return { start, topics };
}

async function rewindTopics(
  supabase: SupabaseClient,
  deck: TopicDeckId,
  start: number,
): Promise<void> {
  await supabase.from("content_topic_cursors").update({ next_index: start }).eq("deck", deck);
}

async function dayHasIdeas(supabase: SupabaseClient, date: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("ideation_items")
    .select("id", { count: "exact", head: true })
    .eq("slot_date", date)
    .not("lane", "is", null)
    .neq("lane", "video");
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

function topicLine(intent: ContentIntent, topic: ContentTopic): string {
  return `${intent}: ${topic.label} — ${topic.brief}`;
}

async function generateDay(
  supabase: SupabaseClient,
  date: string,
  weekStart: string,
  requestedBy: string | null,
  focus: string | null,
): Promise<void> {
  const listDay = slideshowSecond(date) === "list";
  const tips = await takeTopics(supabase, "couples_tip", 2);
  const promos = await takeTopics(supabase, "couples_promo", listDay ? 1 : 2);
  const listTake = listDay ? await takeTopics(supabase, "couples_list", 1) : null;
  const venue = await takeTopics(supabase, "venue_promo", 1);
  const taken: Array<[TopicDeckId, number]> = [
    ["couples_tip", tips.start],
    ["couples_promo", promos.start],
    ["venue_promo", venue.start],
  ];
  if (listTake) taken.push(["couples_list", listTake.start]);

  const topics: DayTopics = {
    slideshow: { tip: tips.topics[0]!, promo: (listTake ?? promos).topics[0]! },
    pin: { tip: tips.topics[1]!, promo: listDay ? promos.topics[0]! : promos.topics[1]! },
    linkedin: { intent: "promo", topic: venue.topics[0]! },
  };

  try {
    const taste = await tasteLines(supabase);
    const focusLine = focus ? `\nBias every idea toward this focus: ${focus}` : "";
    const user = `Day: ${formatDayHeading(date)}.
Write 3 distinct hooks for each topic below. Same topic, different angles. Do not swap topics between lanes.

Slideshow (couples${listDay ? ", 6 slides: a cover plus 5" : ", about 5 slides"})
- ${topicLine("tip", topics.slideshow.tip)}
- ${listDay ? `list (return these in promo): ${topics.slideshow.promo.label} — ${topics.slideshow.promo.brief}` : topicLine("promo", topics.slideshow.promo)}
${listDay ? "This slideshow is a list, not a pain-then-feature promo. Each hook is a short paragraph with the five items, the screen on each item that has one, and one light First Look mention." : ""}

Pin (couples, one image)
- ${topicLine("tip", topics.pin.tip)}
- ${topicLine("promo", topics.pin.promo)}

LinkedIn (venues and planners, one square image, promo only)
- ${topicLine("promo", topics.linkedin.topic)}
The reader is a venue or planner. Name the pain, then how First Look handles it. When the topic is the couple working in the book, the post is still to the venue or planner.
${focusLine}
${taste ? `\n${taste}` : ""}`;

    const parsed = await callClaudeJson({
      system: SYSTEM_PROMPT,
      user,
      maxTokens: 4096,
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["slideshow", "pin", "linkedin"],
        properties: {
          slideshow: pairSchema(),
          pin: pairSchema(),
          linkedin: ideaListSchema(),
        },
      },
    });

    if (!isRecord(parsed)) throw new Error("The model returned an unexpected response.");
    const slideshow = readPair(parsed.slideshow);
    const pin = readPair(parsed.pin);
    const linkedin = threeStrings(parsed.linkedin);
    if (!slideshow || !pin || !linkedin) {
      throw new Error("The model left a lane short.");
    }

    const rows = [
      ...rowsForLane("slideshow", date, weekStart, requestedBy, topics.slideshow.tip, slideshow.tip, "tip"),
      ...rowsForLane("slideshow", date, weekStart, requestedBy, topics.slideshow.promo, slideshow.promo, "promo"),
      ...rowsForLane("pin", date, weekStart, requestedBy, topics.pin.tip, pin.tip, "tip"),
      ...rowsForLane("pin", date, weekStart, requestedBy, topics.pin.promo, pin.promo, "promo"),
      ...rowsForLane(
        "linkedin",
        date,
        weekStart,
        requestedBy,
        topics.linkedin.topic,
        linkedin,
        topics.linkedin.intent,
      ),
    ];

    const { error } = await supabase.from("ideation_items").insert(rows);
    if (error) throw new Error(error.message);
  } catch (err) {
    await Promise.all(taken.map(([deck, start]) => rewindTopics(supabase, deck, start)));
    throw err;
  }
}

function readPair(value: unknown): { tip: string[]; promo: string[] } | null {
  if (!isRecord(value)) return null;
  const tip = threeStrings(value.tip);
  const promo = threeStrings(value.promo);
  if (!tip || !promo) return null;
  return { tip, promo };
}

function rowsForLane(
  lane: ContentLane,
  date: string,
  weekStart: string,
  requestedBy: string | null,
  topic: ContentTopic,
  ideas: string[],
  intent: ContentIntent,
) {
  const production = laneProduction(lane);
  const carousel_slides =
    lane === "slideshow" && isCoupleListTopic(topic.key) ? 6 : production.carousel_slides;
  return ideas.map((idea_text) => ({
    idea_text,
    requested_by: requestedBy,
    lane,
    intent,
    topic_key: topic.key,
    slot_date: date,
    week_start: weekStart,
    platform: production.platform,
    format: production.format,
    audience_group: production.audience_group,
    carousel_slides,
  }));
}

async function generateLane(
  supabase: SupabaseClient,
  date: string,
  weekStart: string,
  lane: ContentLane,
  requestedBy: string | null,
  focus: string | null,
): Promise<void> {
  if (lane === "video") {
    throw new Error("Videos are assigned on the schedule.");
  }
  const listDay = lane === "slideshow" && slideshowSecond(date) === "list";
  const tipTake =
    lane === "linkedin"
      ? null
      : await takeTopics(supabase, "couples_tip", 1);
  const promoTake =
    lane === "linkedin" || listDay
      ? null
      : await takeTopics(supabase, "couples_promo", 1);
  const listTake = listDay ? await takeTopics(supabase, "couples_list", 1) : null;
  const venueTake =
    lane === "linkedin" ? await takeTopics(supabase, "venue_promo", 1) : null;
  const rewinds: Array<[TopicDeckId, number]> = [];
  if (tipTake) rewinds.push(["couples_tip", tipTake.start]);
  if (promoTake) rewinds.push(["couples_promo", promoTake.start]);
  if (listTake) rewinds.push(["couples_list", listTake.start]);
  if (venueTake) rewinds.push(["venue_promo", venueTake.start]);

  try {
    const taste = await tasteLines(supabase);
    const focusLine = focus ? `\nBias every idea toward this focus: ${focus}` : "";
    let user: string;
    let jsonSchema: Record<string, unknown>;

    if (lane === "linkedin") {
      const topic = venueTake!.topics[0]!;
      user = `Day: ${formatDayHeading(date)}.
Write 3 LinkedIn ideas for venues and planners. Each one becomes a post with one square image. Intent: promo.
Topic: ${topicLine("promo", topic)}
The reader is a venue or planner. Name the pain, then how First Look handles it. When the topic is the couple working in the book, the post is still to the venue or planner.
${focusLine}
${taste ? `\n${taste}` : ""}`;
      jsonSchema = {
        type: "object",
        additionalProperties: false,
        required: ["ideas"],
        properties: {
          ideas: ideaListSchema(),
        },
      };
    } else {
      const tip = tipTake!.topics[0]!;
      const second = (listTake ?? promoTake)!.topics[0]!;
      user = listTake
        ? `Day: ${formatDayHeading(date)}. Lane: ${lane}.
Write 3 tip hooks and 3 list hooks. Put the list hooks in promo. Each list hook is a short paragraph: the cover, the five pieces of advice, which real screen goes on which item, and one light mention of First Look. Not a pain-then-feature promo.
- ${topicLine("tip", tip)}
- list: ${second.label} — ${second.brief}
${focusLine}
${taste ? `\n${taste}` : ""}`
        : `Day: ${formatDayHeading(date)}. Lane: ${lane}.
Write 3 tip hooks and 3 promo hooks. Same topic inside each group, different angles.
- ${topicLine("tip", tip)}
- ${topicLine("promo", second)}
${focusLine}
${taste ? `\n${taste}` : ""}`;
      jsonSchema = pairSchema();
    }

    const parsed = await callClaudeJson({
      system: SYSTEM_PROMPT,
      user,
      maxTokens: listTake ? 4096 : 2048,
      jsonSchema,
    });
    if (!isRecord(parsed)) throw new Error("The model returned an unexpected response.");

    let rows;
    if (lane === "linkedin") {
      const ideas = threeStrings(parsed.ideas);
      if (!ideas) throw new Error("The model left this lane short.");
      rows = rowsForLane(lane, date, weekStart, requestedBy, venueTake!.topics[0]!, ideas, "promo");
    } else {
      const pair = readPair(parsed);
      if (!pair) throw new Error("The model left this lane short.");
      rows = [
        ...rowsForLane(lane, date, weekStart, requestedBy, tipTake!.topics[0]!, pair.tip, "tip"),
        ...rowsForLane(lane, date, weekStart, requestedBy, (listTake ?? promoTake)!.topics[0]!, pair.promo, "promo"),
      ];
    }

    const { data: inserted, error } = await supabase
      .from("ideation_items")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);

    const keep = new Set((inserted ?? []).map((row) => row.id as string));
    const { data: stale, error: staleError } = await supabase
      .from("ideation_items")
      .select("id")
      .eq("slot_date", date)
      .eq("lane", lane)
      .is("rating", null)
      .is("used_at", null);
    if (staleError) throw new Error(staleError.message);
    const drop = (stale ?? [])
      .map((row) => row.id as string)
      .filter((id) => !keep.has(id));
    if (drop.length > 0) {
      const { error: deleteError } = await supabase.from("ideation_items").delete().in("id", drop);
      if (deleteError) throw new Error(deleteError.message);
    }
  } catch (err) {
    await Promise.all(rewinds.map(([deck, start]) => rewindTopics(supabase, deck, start)));
    throw err;
  }
}

export async function generateContentWeek(
  supabase: SupabaseClient,
  options: {
    requestedBy?: string | null;
    date?: string | null;
    lane?: ContentLane | null;
    focus?: string | null;
    today?: string;
  } = {},
): Promise<GenerateWeekResult> {
  if (!process.env.MODEL_API_KEY?.trim()) {
    throw new Error("MODEL_API_KEY is not configured.");
  }

  const weekStart = postingWeekMonday(options.today);
  await ensureWeekSlots(supabase, weekStart);
  const requestedBy = options.requestedBy ?? null;
  const focus = options.focus?.trim() || null;
  const errors: string[] = [];
  const daysGenerated: string[] = [];
  const daysSkipped: string[] = [];

  if (options.date && options.lane) {
    if (!postingDates(weekStart).includes(options.date)) {
      throw new Error("That day is outside this posting week.");
    }
    if (!CONTENT_LANES.includes(options.lane)) {
      throw new Error("Unknown post type.");
    }
    await generateLane(supabase, options.date, weekStart, options.lane, requestedBy, focus);
    daysGenerated.push(options.date);
    return { weekStart, daysGenerated, daysSkipped, errors };
  }

  const dates = options.date ? [options.date] : postingDates(weekStart);
  for (const date of dates) {
    if (!postingDates(weekStart).includes(date)) {
      errors.push(`${date}: outside this posting week.`);
      continue;
    }
    if (await dayHasIdeas(supabase, date)) {
      daysSkipped.push(date);
      continue;
    }
    try {
      await generateDay(supabase, date, weekStart, requestedBy, focus);
      daysGenerated.push(date);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not generate this day.";
      errors.push(`${formatDayHeading(date)}: ${message}`);
    }
  }

  return { weekStart, daysGenerated, daysSkipped, errors };
}
