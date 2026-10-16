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
  deckForStyle,
  POST_STYLE_META,
  stylePromptBlock,
  stylesForIntent,
  type PostStyle,
} from "@/lib/admin/content-styles";
import {
  isCoupleListTopic,
  TOPIC_DECKS,
  type ContentTopic,
  type TopicDeckId,
} from "@/lib/admin/content-topics";
import { ensureWeekSlots } from "@/lib/admin/content-week/load";

const IDEAS_PER_INTENT = 3;
/** Prefer topics not used in the last N shortlist rows. */
const RECENT_TOPIC_LOOKBACK = 40;

const SYSTEM_PROMPT = `You brainstorm short-form social ideas for First Look, a wedding-planning
SaaS. Two audiences only:
- Couples, for TikTok slideshows and Pinterest pins.
- Venues and planners, for LinkedIn posts that each get one square image. LinkedIn is always a promo. The reader is the venue or planner. Never write a couples tip, and never write industry advice that leaves the product out.

Tone: warm, useful, a little funny, never salesy. Never use the word "AI".

Both tips and promos stay inside what First Look already does. Never recommend another app, spreadsheet, Google or Apple calendar, Notion, a paper chart, a group text, or a system the viewer has to build.

Couple behaviors the product already covers: a due date and reminder on each budget line, budget categories, a dated checklist, the guest list and RSVPs, vendor search, the seating chart, the day-of timeline, the wedding website, the calendar (tastings, fittings, deadlines, payments), notes and files, the overview, the assistant.
Venue and planner behaviors: inquiries on a board, follow-up automations, the book of weddings, white-label branding, proposals that become contracts, invoices in the couple's wedding, date holds on the calendar, inviting the couple into that wedding, and the couple then working there — checklist, budget, guest list and RSVPs, seating, wedding website, day-of timeline, and the venue or planner's vendor library.

You are given one brief per idea. Each brief already has a topic and a style. Write exactly one hook for that brief — do not invent a different topic or style. Do not write three angles on the same topic.

Post styles:
${stylePromptBlock()}

Length:
- tip, myth, hot_take, stop_doing, before_after, promo: one or two sentences.
- numbered and save_this: a short paragraph — cover line, the checklist or list items, screens named where the brief says, and at most one light First Look mention for promo/list (never on the cover).
- LinkedIn: one or two sentences a headline can carry. Name First Look. Open on the pain, then how the product handles it for a venue or planner.

Return ONLY the JSON shape you are given. No markdown, no extra keys.`;

export type GenerateWeekResult = {
  weekStart: string;
  daysGenerated: string[];
  daysSkipped: string[];
  errors: string[];
};

type IdeaBrief = {
  intent: ContentIntent;
  style: PostStyle;
  topic: ContentTopic;
};

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

function pickStyles(intent: ContentIntent, count: number, bias?: PostStyle | null): PostStyle[] {
  const pool = shuffleInPlace([...stylesForIntent(intent)]);
  const out: PostStyle[] = [];
  if (bias && pool.includes(bias)) {
    out.push(bias);
  }
  for (const style of pool) {
    if (out.length >= count) break;
    if (!out.includes(style)) out.push(style);
  }
  // If the pool is smaller than count, allow repeats after unique exhaustion.
  while (out.length < count) {
    const fallback = pool[out.length % pool.length] ?? (intent === "tip" ? "tip" : "promo");
    out.push(fallback);
  }
  return out.slice(0, count);
}

async function recentTopicKeys(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("ideation_items")
    .select("topic_key")
    .not("topic_key", "is", null)
    .order("created_at", { ascending: false })
    .limit(RECENT_TOPIC_LOOKBACK);
  if (error) throw new Error(error.message);
  return new Set(
    (data ?? [])
      .map((row) => row.topic_key as string | null)
      .filter((key): key is string => Boolean(key)),
  );
}

function pickTopics(
  deck: TopicDeckId,
  count: number,
  usedKeys: Set<string>,
  recent: Set<string>,
): ContentTopic[] {
  const list = TOPIC_DECKS[deck];
  const fresh = list.filter((topic) => !usedKeys.has(topic.key) && !recent.has(topic.key));
  const unused = list.filter((topic) => !usedKeys.has(topic.key));
  const pool = shuffleInPlace([...(fresh.length >= count ? fresh : unused.length > 0 ? unused : list)]);
  const out: ContentTopic[] = [];
  for (const topic of pool) {
    if (out.length >= count) break;
    if (out.some((row) => row.key === topic.key)) continue;
    out.push(topic);
    usedKeys.add(topic.key);
  }
  while (out.length < count) {
    const topic = list[out.length % list.length]!;
    out.push(topic);
    usedKeys.add(topic.key);
  }
  return out;
}

function buildBriefs(args: {
  intent: ContentIntent;
  count: number;
  usedKeys: Set<string>;
  recent: Set<string>;
  biasStyle?: PostStyle | null;
}): IdeaBrief[] {
  const styles = pickStyles(args.intent, args.count, args.biasStyle);
  return styles.map((style) => {
    const deck = deckForStyle(style, args.intent);
    const [topic] = pickTopics(deck, 1, args.usedKeys, args.recent);
    return { intent: args.intent, style, topic: topic! };
  });
}

function briefLines(briefs: IdeaBrief[]): string {
  return briefs
    .map((brief, index) => {
      const meta = POST_STYLE_META[brief.style];
      return `${index + 1}. intent=${brief.intent} style=${brief.style} (${meta.label}) topic=${brief.topic.label} — ${brief.topic.brief}
   Style rule: ${meta.brief}`;
    })
    .join("\n");
}

/** Anthropic structured output only allows minItems 0 or 1, and no maxItems. */
function ideaTextListSchema(count: number) {
  return {
    type: "array",
    minItems: 1,
    description: `Exactly ${count} idea strings, same order as the briefs.`,
    items: { type: "string" },
  };
}

function pairSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["tip", "promo"],
    properties: {
      tip: ideaTextListSchema(IDEAS_PER_INTENT),
      promo: ideaTextListSchema(IDEAS_PER_INTENT),
    },
  };
}

function readIdeaTexts(value: unknown, count: number): string[] | null {
  if (!Array.isArray(value)) return null;
  const out = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
  if (out.length < count) return null;
  return out.slice(0, count);
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

function rowsForBriefs(
  lane: ContentLane,
  date: string,
  weekStart: string,
  requestedBy: string | null,
  briefs: IdeaBrief[],
  texts: string[],
) {
  const production = laneProduction(lane);
  return briefs.map((brief, index) => {
    const carousel_slides =
      lane === "slideshow" &&
      (brief.style === "numbered" || brief.style === "save_this" || isCoupleListTopic(brief.topic.key))
        ? 6
        : production.carousel_slides;
    return {
      idea_text: texts[index]!,
      requested_by: requestedBy,
      lane,
      intent: brief.intent,
      post_style: brief.style,
      topic_key: brief.topic.key,
      slot_date: date,
      week_start: weekStart,
      platform: production.platform,
      format: production.format,
      audience_group: production.audience_group,
      carousel_slides,
    };
  });
}

async function generateDay(
  supabase: SupabaseClient,
  date: string,
  weekStart: string,
  requestedBy: string | null,
  focus: string | null,
): Promise<void> {
  const recent = await recentTopicKeys(supabase);
  const usedKeys = new Set<string>();
  const listBias = slideshowSecond(date) === "list" ? ("numbered" as const) : null;

  const slideshowTip = buildBriefs({
    intent: "tip",
    count: IDEAS_PER_INTENT,
    usedKeys,
    recent,
  });
  const slideshowPromo = buildBriefs({
    intent: "promo",
    count: IDEAS_PER_INTENT,
    usedKeys,
    recent,
    biasStyle: listBias,
  });
  const pinTip = buildBriefs({
    intent: "tip",
    count: IDEAS_PER_INTENT,
    usedKeys,
    recent,
  });
  const pinPromo = buildBriefs({
    intent: "promo",
    count: IDEAS_PER_INTENT,
    usedKeys,
    recent,
  });
  // LinkedIn stays product promos for venues/planners — random venue topics, promo style.
  const linkedinTopics = pickTopics("venue_promo", IDEAS_PER_INTENT, usedKeys, recent);
  const linkedin: IdeaBrief[] = linkedinTopics.map((topic) => ({
    intent: "promo",
    style: "promo",
    topic,
  }));

  const taste = await tasteLines(supabase);
  const focusLine = focus ? `\nBias every idea toward this focus: ${focus}` : "";
  const user = `Day: ${formatDayHeading(date)}.
Write exactly one hook per brief, same order. Different topics and styles on purpose — do not collapse them.

Slideshow (couples, TikTok carousel)
Tip briefs:
${briefLines(slideshowTip)}

Promo briefs:
${briefLines(slideshowPromo)}

Pin (couples, one image)
Tip briefs:
${briefLines(pinTip)}

Promo briefs:
${briefLines(pinPromo)}

LinkedIn (venues and planners, one square image)
${briefLines(linkedin)}
The reader is a venue or planner.
${focusLine}
${taste ? `\n${taste}` : ""}`;

  const parsed = await callClaudeJson({
    system: SYSTEM_PROMPT,
    user,
    maxTokens: 6144,
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["slideshow", "pin", "linkedin"],
      properties: {
        slideshow: pairSchema(),
        pin: pairSchema(),
        linkedin: ideaTextListSchema(IDEAS_PER_INTENT),
      },
    },
  });

  if (!isRecord(parsed)) throw new Error("The model returned an unexpected response.");
  if (!isRecord(parsed.slideshow) || !isRecord(parsed.pin)) {
    throw new Error("The model left a lane short.");
  }

  const slideshowTipTexts = readIdeaTexts(parsed.slideshow.tip, IDEAS_PER_INTENT);
  const slideshowPromoTexts = readIdeaTexts(parsed.slideshow.promo, IDEAS_PER_INTENT);
  const pinTipTexts = readIdeaTexts(parsed.pin.tip, IDEAS_PER_INTENT);
  const pinPromoTexts = readIdeaTexts(parsed.pin.promo, IDEAS_PER_INTENT);
  const linkedinTexts = readIdeaTexts(parsed.linkedin, IDEAS_PER_INTENT);
  if (
    !slideshowTipTexts ||
    !slideshowPromoTexts ||
    !pinTipTexts ||
    !pinPromoTexts ||
    !linkedinTexts
  ) {
    throw new Error("The model left a lane short.");
  }

  const rows = [
    ...rowsForBriefs("slideshow", date, weekStart, requestedBy, slideshowTip, slideshowTipTexts),
    ...rowsForBriefs("slideshow", date, weekStart, requestedBy, slideshowPromo, slideshowPromoTexts),
    ...rowsForBriefs("pin", date, weekStart, requestedBy, pinTip, pinTipTexts),
    ...rowsForBriefs("pin", date, weekStart, requestedBy, pinPromo, pinPromoTexts),
    ...rowsForBriefs("linkedin", date, weekStart, requestedBy, linkedin, linkedinTexts),
  ];

  const { error } = await supabase.from("ideation_items").insert(rows);
  if (error) throw new Error(error.message);
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

  const recent = await recentTopicKeys(supabase);
  const usedKeys = new Set<string>();
  const taste = await tasteLines(supabase);
  const focusLine = focus ? `\nBias every idea toward this focus: ${focus}` : "";

  let rows: ReturnType<typeof rowsForBriefs>;

  if (lane === "linkedin") {
    const briefs: IdeaBrief[] = pickTopics("venue_promo", IDEAS_PER_INTENT, usedKeys, recent).map(
      (topic) => ({ intent: "promo", style: "promo" as PostStyle, topic }),
    );
    const user = `Day: ${formatDayHeading(date)}. Lane: LinkedIn.
Write exactly one hook per brief for venues and planners. Each becomes a post with one square image.
${briefLines(briefs)}
The reader is a venue or planner.
${focusLine}
${taste ? `\n${taste}` : ""}`;
    const parsed = await callClaudeJson({
      system: SYSTEM_PROMPT,
      user,
      maxTokens: 2048,
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["ideas"],
        properties: { ideas: ideaTextListSchema(IDEAS_PER_INTENT) },
      },
    });
    if (!isRecord(parsed)) throw new Error("The model returned an unexpected response.");
    const texts = readIdeaTexts(parsed.ideas, IDEAS_PER_INTENT);
    if (!texts) throw new Error("The model left this lane short.");
    rows = rowsForBriefs(lane, date, weekStart, requestedBy, briefs, texts);
  } else {
    const listBias =
      lane === "slideshow" && slideshowSecond(date) === "list" ? ("numbered" as const) : null;
    const tipBriefs = buildBriefs({
      intent: "tip",
      count: IDEAS_PER_INTENT,
      usedKeys,
      recent,
    });
    const promoBriefs = buildBriefs({
      intent: "promo",
      count: IDEAS_PER_INTENT,
      usedKeys,
      recent,
      biasStyle: listBias,
    });
    const user = `Day: ${formatDayHeading(date)}. Lane: ${lane}.
Write exactly one hook per brief, same order. Different topics and styles on purpose.

Tip briefs:
${briefLines(tipBriefs)}

Promo briefs:
${briefLines(promoBriefs)}
${focusLine}
${taste ? `\n${taste}` : ""}`;
    const parsed = await callClaudeJson({
      system: SYSTEM_PROMPT,
      user,
      maxTokens: 4096,
      jsonSchema: pairSchema(),
    });
    if (!isRecord(parsed)) throw new Error("The model returned an unexpected response.");
    const tipTexts = readIdeaTexts(parsed.tip, IDEAS_PER_INTENT);
    const promoTexts = readIdeaTexts(parsed.promo, IDEAS_PER_INTENT);
    if (!tipTexts || !promoTexts) throw new Error("The model left this lane short.");
    rows = [
      ...rowsForBriefs(lane, date, weekStart, requestedBy, tipBriefs, tipTexts),
      ...rowsForBriefs(lane, date, weekStart, requestedBy, promoBriefs, promoTexts),
    ];
  }

  const { data: inserted, error } = await supabase.from("ideation_items").insert(rows).select("id");
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
