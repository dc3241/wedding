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
  pickLeastRecentTopics,
  repeatsShownCopy,
  retiredClaimPromptBlock,
  shownCopyPromptBlock,
} from "@/lib/admin/content-angles";
import {
  loadContentHistory,
  SHOWN_COPY_PROMPT_LIMIT,
  type ContentHistory,
} from "@/lib/admin/content-history";
import {
  deckForStyle,
  LINKEDIN_POST_STYLES,
  linkedInDeckForStyle,
  POST_STYLE_META,
  stylePromptBlock,
  stylesForIntent,
  type PostStyle,
} from "@/lib/admin/content-styles";
import {
  isCoupleListTopic,
  TOPIC_DECKS,
  type ContentTopic,
} from "@/lib/admin/content-topics";
import { ensureWeekSlots } from "@/lib/admin/content-week/load";

const IDEAS_PER_INTENT = 3;

const SYSTEM_PROMPT = `You brainstorm short-form social ideas for First Look, a wedding-planning
SaaS. Two audiences only:
- Couples, for TikTok slideshows and Pinterest pins.
- Venues and planners, for LinkedIn posts that each get one square image. The reader is always the venue or planner. Never write a couples tip. Never write industry advice that leaves what First Look already does.

Tone: warm, useful, a little funny, never salesy. Never use the word "AI".

Both tips and promos stay inside what First Look already does. Never recommend another app, spreadsheet, Google or Apple calendar, Notion, a paper chart, a group text, or a system the viewer has to build.

Couple behaviors the product already covers: a due date and reminder on each budget line, budget categories, a dated checklist, the guest list and RSVPs, vendor search, the seating chart, the day-of timeline, the wedding website, the calendar (tastings, fittings, deadlines, payments), notes and files, the overview, the assistant.
Venue and planner behaviors: inquiries on a board, follow-up automations, the book of weddings, white-label branding, proposals that become contracts, invoices in the couple's wedding, date holds on the calendar, inviting the couple into that wedding, and the couple then working there — checklist, budget, guest list and RSVPs, seating, wedding website, day-of timeline, and the venue or planner's vendor library.

You are given one brief per idea. Each brief already has a topic and a style. Write exactly one hook for that brief — do not invent a different topic or style. Do not write three angles on the same topic.

A hook that was already shown must not come back, even rephrased. Distinctive number pairings (for example 15 minutes vs 45 minutes) are the same hook. Timeline and day-of tips are welcome; the retired 15-minute ceremony-to-reception photo-gap myth is not.

Post styles:
${stylePromptBlock()}

LinkedIn styles: use the same creative shapes (Save this, myth, hot take, numbered list, stop doing, before/after, pain→feature). Always speak to a venue or planner. Tip-family styles may omit naming First Look in the hook; promo and pain→feature may name it. save_this for LinkedIn is a team/ops checklist (send this to your coordinator), not a couples vendor list.

Length:
- myth, hot_take, stop_doing, before_after, promo: one or two sentences (LinkedIn: a headline can carry it).
- numbered and save_this: a short paragraph — cover line, the checklist or list items, screens named where the brief says, and at most one light First Look mention for promo/list (never on the cover).

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

function pickStylesFromPool(
  poolIn: readonly PostStyle[],
  count: number,
  bias?: PostStyle | null,
): PostStyle[] {
  const pool = shuffleInPlace([...poolIn]);
  const out: PostStyle[] = [];
  if (bias && pool.includes(bias)) {
    out.push(bias);
  }
  for (const style of pool) {
    if (out.length >= count) break;
    if (!out.includes(style)) out.push(style);
  }
  while (out.length < count) {
    const fallback = pool[out.length % pool.length] ?? "promo";
    out.push(fallback);
  }
  return out.slice(0, count);
}

function pickStyles(intent: ContentIntent, count: number, bias?: PostStyle | null): PostStyle[] {
  return pickStylesFromPool(stylesForIntent(intent), count, bias);
}

function buildBriefs(args: {
  intent: ContentIntent;
  count: number;
  usedKeys: Set<string>;
  history: ContentHistory;
  biasStyle?: PostStyle | null;
}): IdeaBrief[] {
  const styles = pickStyles(args.intent, args.count, args.biasStyle);
  return styles.map((style) => {
    const deck = deckForStyle(style, args.intent);
    const styleRecent = args.history.topicKeysByStyle[style] ?? [];
    const [topic] = pickLeastRecentTopics(
      TOPIC_DECKS[deck],
      1,
      args.usedKeys,
      [...styleRecent, ...args.history.recentTopicKeys],
    );
    return { intent: args.intent, style, topic: topic! };
  });
}

/** LinkedIn: every creative style, venue/planner topics only. */
function buildLinkedInBriefs(args: {
  count: number;
  usedKeys: Set<string>;
  history: ContentHistory;
}): IdeaBrief[] {
  const styles = pickStylesFromPool(LINKEDIN_POST_STYLES, args.count);
  return styles.map((style) => {
    const deck = linkedInDeckForStyle(style);
    const styleRecent = args.history.topicKeysByStyle[style] ?? [];
    const [topic] = pickLeastRecentTopics(
      TOPIC_DECKS[deck],
      1,
      args.usedKeys,
      [...styleRecent, ...args.history.recentTopicKeys],
    );
    return { intent: "promo", style, topic: topic! };
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

async function tasteLines(
  supabase: SupabaseClient,
  shownTexts: string[],
): Promise<string> {
  const { data: disliked } = await supabase
    .from("ideation_items")
    .select("idea_text, comment")
    .eq("rating", "down")
    .order("created_at", { ascending: false })
    .limit(6);

  const lines: string[] = [retiredClaimPromptBlock()];
  const shown = shownCopyPromptBlock(shownTexts.slice(0, SHOWN_COPY_PROMPT_LIMIT));
  if (shown) lines.push(shown);
  if (disliked?.length) {
    lines.push("Ideas the team has passed (avoid this pattern):");
    for (const row of disliked) {
      lines.push(`- "${row.idea_text}"${row.comment ? ` — note: ${row.comment}` : ""}`);
    }
  }
  return lines.join("\n");
}

async function rewriteRepeatedHooks(
  briefs: IdeaBrief[],
  texts: string[],
  shown: string[],
): Promise<string[]> {
  const out = texts.map((text) => text.trim());
  const prior: string[] = [...shown];
  const redo: { brief: IdeaBrief; index: number; text: string }[] = [];
  briefs.forEach((brief, index) => {
    const text = out[index]!;
    if (repeatsShownCopy(text, prior)) redo.push({ brief, index, text });
    else prior.push(text);
  });
  if (redo.length === 0) return out;

  let parsed: unknown;
  try {
    parsed = await callClaudeJson({
    system: SYSTEM_PROMPT,
    user: `These hooks repeat a retired or already-shown angle. Rewrite each one.
Keep the assigned topic and style. Do not reuse the banned claim or a close paraphrase.
${retiredClaimPromptBlock()}
${shownCopyPromptBlock([...shown, ...out.filter((_, index) => !redo.some((row) => row.index === index))])}

${redo
  .map(
    (row, index) =>
      `${index + 1}. intent=${row.brief.intent} style=${row.brief.style} topic=${row.brief.topic.label} — ${row.brief.topic.brief}
   Style rule: ${POST_STYLE_META[row.brief.style].brief}
   Rejected draft: ${JSON.stringify(row.text)}`,
  )
  .join("\n")}`,
    maxTokens: 2048,
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["ideas"],
      properties: { ideas: ideaTextListSchema(redo.length) },
    },
  });
  } catch (err) {
    console.warn("ideation-rewrite:", err);
    return out;
  }

  const next = isRecord(parsed) ? readIdeaTexts(parsed.ideas, redo.length) : null;
  if (!next) {
    console.warn("ideation-rewrite: model left the rewrite short; keeping first drafts.");
    return out;
  }

  const accepted = [...shown];
  out.forEach((text, index) => {
    if (!redo.some((row) => row.index === index)) accepted.push(text);
  });
  redo.forEach((row, i) => {
    const candidate = next[i]!;
    if (!repeatsShownCopy(candidate, accepted)) {
      out[row.index] = candidate;
      accepted.push(candidate);
      return;
    }
    console.warn(`ideation-rewrite: still overlapped after retry (${row.brief.topic.key}).`);
    out[row.index] = candidate;
    accepted.push(candidate);
  });
  return out;
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
  const history = await loadContentHistory(supabase);
  const usedKeys = new Set<string>();
  const listBias = slideshowSecond(date) === "list" ? ("numbered" as const) : null;

  const slideshowTip = buildBriefs({
    intent: "tip",
    count: IDEAS_PER_INTENT,
    usedKeys,
    history,
  });
  const slideshowPromo = buildBriefs({
    intent: "promo",
    count: IDEAS_PER_INTENT,
    usedKeys,
    history,
    biasStyle: listBias,
  });
  const pinTip = buildBriefs({
    intent: "tip",
    count: IDEAS_PER_INTENT,
    usedKeys,
    history,
  });
  const pinPromo = buildBriefs({
    intent: "promo",
    count: IDEAS_PER_INTENT,
    usedKeys,
    history,
  });
  const linkedin = buildLinkedInBriefs({
    count: IDEAS_PER_INTENT,
    usedKeys,
    history,
  });

  const taste = await tasteLines(supabase, history.shownTexts);
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

LinkedIn (venues and planners, one square image — mixed styles, never couples tips)
${briefLines(linkedin)}
The reader is a venue or planner. Match each style brief to that audience.
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

  const groups = [
    { briefs: slideshowTip, texts: slideshowTipTexts },
    { briefs: slideshowPromo, texts: slideshowPromoTexts },
    { briefs: pinTip, texts: pinTipTexts },
    { briefs: pinPromo, texts: pinPromoTexts },
    { briefs: linkedin, texts: linkedinTexts },
  ];
  const rewritten = await rewriteRepeatedHooks(
    groups.flatMap((group) => group.briefs),
    groups.flatMap((group) => group.texts),
    history.shownTexts,
  );
  let offset = 0;
  const nextTexts = groups.map((group) => {
    const slice = rewritten.slice(offset, offset + group.texts.length);
    offset += group.texts.length;
    return slice;
  });

  const rows = [
    ...rowsForBriefs("slideshow", date, weekStart, requestedBy, slideshowTip, nextTexts[0]!),
    ...rowsForBriefs("slideshow", date, weekStart, requestedBy, slideshowPromo, nextTexts[1]!),
    ...rowsForBriefs("pin", date, weekStart, requestedBy, pinTip, nextTexts[2]!),
    ...rowsForBriefs("pin", date, weekStart, requestedBy, pinPromo, nextTexts[3]!),
    ...rowsForBriefs("linkedin", date, weekStart, requestedBy, linkedin, nextTexts[4]!),
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

  const history = await loadContentHistory(supabase);
  const usedKeys = new Set<string>();
  const taste = await tasteLines(supabase, history.shownTexts);
  const focusLine = focus ? `\nBias every idea toward this focus: ${focus}` : "";

  let rows: ReturnType<typeof rowsForBriefs>;

  if (lane === "linkedin") {
    const briefs = buildLinkedInBriefs({
      count: IDEAS_PER_INTENT,
      usedKeys,
      history,
    });
    const user = `Day: ${formatDayHeading(date)}. Lane: LinkedIn.
Write exactly one hook per brief for venues and planners. Each becomes a post with one square image. Mixed styles on purpose — do not collapse them into pain-then-feature.
${briefLines(briefs)}
The reader is a venue or planner. Match each style brief to that audience.
${focusLine}
${taste ? `\n${taste}` : ""}`;
    const parsed = await callClaudeJson({
      system: SYSTEM_PROMPT,
      user,
      maxTokens: 3072,
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
    rows = rowsForBriefs(
      lane,
      date,
      weekStart,
      requestedBy,
      briefs,
      await rewriteRepeatedHooks(briefs, texts, history.shownTexts),
    );
  } else {
    const listBias =
      lane === "slideshow" && slideshowSecond(date) === "list" ? ("numbered" as const) : null;
    const tipBriefs = buildBriefs({
      intent: "tip",
      count: IDEAS_PER_INTENT,
      usedKeys,
      history,
    });
    const promoBriefs = buildBriefs({
      intent: "promo",
      count: IDEAS_PER_INTENT,
      usedKeys,
      history,
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
    const rewritten = await rewriteRepeatedHooks(
      [...tipBriefs, ...promoBriefs],
      [...tipTexts, ...promoTexts],
      history.shownTexts,
    );
    rows = [
      ...rowsForBriefs(
        lane,
        date,
        weekStart,
        requestedBy,
        tipBriefs,
        rewritten.slice(0, tipTexts.length),
      ),
      ...rowsForBriefs(
        lane,
        date,
        weekStart,
        requestedBy,
        promoBriefs,
        rewritten.slice(tipTexts.length),
      ),
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
