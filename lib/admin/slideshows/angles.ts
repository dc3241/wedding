/**
 * The strategy brain for slideshow batches: what each mechanic looks like,
 * what each product feature can honestly claim, and the standing copy rules.
 *
 * Edit FEATURE_FACTS when the product changes. The generator may only claim
 * what is listed here for a feature. That is how "the assistant can't pull
 * pricing" stays true in every post.
 */

import { FEATURE_BY_KEY, MECHANIC_BY_KEY } from "./logic";

export const FEATURE_FACTS: Record<string, string> = {
  assistant_venue_search:
    "The assistant takes a city, a budget, and a guest count, finds venues in that city, and drafts a message to each venue asking for pricing and availability (the budget goes into the message). Drafts wait for the couple's approval: nothing is sent until they approve. The assistant does NOT return venue pricing, does NOT say which venues fit a budget, and does NOT compare prices. Pricing comes back from the venues' own replies.",
  assistant_open_vendors:
    "As the wedding gets closer, the assistant notices vendor categories that are still open and drafts outreach messages to vendors for the couple to review. Nothing is sent until the couple approves. It does not return vendor pricing or pick vendors for them.",
  assistant_ask:
    "The assistant lives inside the couple's plan. They can ask it about their checklist, budget, guests, vendors, or notes. It answers from their own plan. It does not invent numbers and does not know market prices.",
  budget:
    "A budget tracker where the couple enters their own estimates and actuals per category and vendor, tracks what is paid versus still due, and sees deposits and due dates. It does not know market prices.",
  guests:
    "A guest list with RSVP status and plus-ones. Couples see who has replied and who has not.",
  seating:
    "A seating chart built from the guest list, where the couple places guests at tables.",
  timeline:
    "A day-of timeline where the couple lays out the day hour by hour.",
  vendors:
    "A place to track vendors the couple is talking to or has booked: contacts, quotes they entered, deposits, and contracts.",
  checklist:
    "A planning checklist with tasks and due dates that the couple works through.",
  website:
    "A wedding website with where and when details, and RSVPs that flow into the guest list.",
  none: "No product. Pure planning value.",
};

export const MECHANIC_PLAYBOOK: Record<string, string> = {
  tip: `PURE TIP. Real advice a couple can use today, specific to a situation, no fluff.
Slide 1: a hook that names a specific pain or mistake. Middle slides: one idea per slide (tip-list, steps, before-after, or statement).
Last slide: a soft close. Set "cta" true on it and name First Look once at most, in the support line, as a light aside. The advice must hold up even if that line is removed.`,
  promo: `DIRECT FEATURE PROMO for the chosen feature. Pain, then what it does, then how a couple uses it (use only the facts given for the feature).
Slide 1: the pain. Middle: what the feature does and what it looks like in use (headline-card rows work well). Last slide: "cta" true. Specific, never generic SaaS-speak.`,
  quiz: `QUIZ: FIND THE MISTAKES. Show a realistic flawed wedding-planning artifact (a day-of timeline, a vendor list, a budget, a guest-list plan) with exactly the stated number of mistakes (usually 3).
Slide 1: hook such as "This timeline has 3 mistakes" plus the flawed artifact as a headline-card (rows: label plus a time or status pill, tone "neutral").
Next slides (2 to 4): one CLUE per slide, a hint and not the answer (tip-list or statement).
Then ONE ask slide: "Comment your answers before you swipe", pill "Comment your score", chips like "1","2","3".
Then ONE answers slide: headline-card with tone "bad" rows for each mistake and the fix in the label or status.
An optional last slide may be a soft close with "cta" true that names First Look once.
The pinned comment holds the full answers so people must open the comments to see them. The caption asks for answers in the comments but never gives them away.`,
  vote: `HOT TAKE: VOTE 1 OR 2. A mildly divisive wedding spending or etiquette choice with two fair sides ("Cut one: florist or photographer?"). Opinion about weddings only, never about a group of people.
Slide 1: the choice (before-after layout, beforeTitle "1 · <side>", afterTitle "2 · <side>" with a few short lines each, or a statement).
Slides 2 to 3: the fair case for each side (before-after or tip-list).
Slide 4 (optional): what to weigh. Do not give numbers or costs.
Last slide: ask slide, "Which side are you on?", pill "Comment 1 or 2", chips for each side.
The pinned comment asks "Comment 1 or 2. Why?". The caption asks for a vote in the comments.`,
  ranking: `RANK THESE. Five wedding items or costs the couple ranks from most to least worth it.
Slide 1: the hook ("Rank these 5 ..."). Slide 2: the five items as a headline-card (label = item, status "Rank it", tone "neutral"). Slides 3 to 4: tension (why people disagree), as statements. Last slide: ask slide, pill "Comment your ranking", chips are the five items shortened.
Never state a "correct" order and never give costs.`,
  myth_truth: `MYTH OR TRUTH. A belief couples commonly hold about planning, with honest context.
Slide 1: "Myth or truth?" plus the belief. Slides 2 to 4: the context on both sides (before-after or tip-list). Last slide: ask slide, pill "Comment myth or truth".
The pinned comment gives your verdict with one clear reason. Only beliefs you can reason about from planning logic, never invented statistics.`,
  story_ask: `SCENARIO: WHAT WOULD YOU DO? A relatable planning dilemma (a guest conflict, a vendor who stopped replying, a plus-one problem).
Slides 1 to 3: the setup and the stakes, as statements. Slide 4: the options (steps or tip-list, at most 3). Last slide: ask slide, pill "Comment what you'd do". No resolution that sells the app.`,
  comment_to_run: `COMMENT TO RUN. The viewer comments a few details and we run it through the in-app assistant and reply with the real result.
Exactly 6 slides:
1 hook plus the offer. 2 the pain, in one sentence. 3 what to comment (headline-card rows for the inputs). 4 what the assistant does (steps, at most 3: Find, Draft, You approve). 5 what you get back, using ONLY the feature facts, including that nothing is sent until approved and that pricing comes from the venues' replies. 6 ask slide with chips for the inputs and pill "Comment yours".
The pinned comment says what to drop in the comments. The caption says we will run it and reply with the assistant's real output.`,
};

export const LAYOUT_GUIDE = `Layouts (pick one per slide) and their data. Leave unused data fields empty ([] or "").
- headline-card: headline plus support; data.tabs (optional short labels), data.rows = up to 5 of {label, status, tone: good|warn|bad|neutral}. Good for timelines (status = a time) and lists.
- tip-list: data.tips = up to 4 of {title, body}. Numbered advice.
- steps: data.steps = up to 4 of {word (one word), caption}.
- before-after: data.beforeTitle, data.before (up to 4 short lines), data.afterTitle, data.after (up to 4). Also works as "side 1 vs side 2".
- statement: text only. data.highlight is a short phrase that appears inside the headline, or "".
- big-number: one figure in data.value. Only a figure that is obviously illustrative or from the prompt. Never a statistic.
- ask: the comment prompt slide. data.pill = the button text (e.g. "Comment your score"). data.chips = up to 4 short chips (e.g. City, Budget, Guest count). No URL, no app button.`;

export const GLOBAL_RULES = `Standing rules (all posts):
- Audience: engaged and newlywed couples planning a wedding. Warm, useful, a little funny, never salesy.
- Never use the word "AI" or "artificial intelligence". Say "the assistant" or "automatically".
- Never state a statistic, an average, a percentage, a study, or what couples "typically spend". Use hypothetical examples clearly framed as examples.
- Never fabricate testimonials, customer quotes, or results. No "a couple told us".
- Claims about the product come ONLY from the feature facts supplied. If a capability is not in the facts, do not claim it.
- Never tell the viewer to use a spreadsheet, outside calendar, Notion, paper chart, or another app.
- First Look is named at most once across the slide text, never in the hook slide.
- One ask per post. Engagement posts ask for a comment and nothing else: no URL, no "link in bio".
- The post must be useful or fun even if the product mention is deleted.
- Headlines at most 90 characters; support lines one short sentence. Plain Latin text, no emoji inside slides (emoji are fine in the caption).`;

export function playbookFor(mechanic: string, feature: string): string {
  const m = MECHANIC_BY_KEY.get(mechanic);
  const f = FEATURE_BY_KEY.get(feature);
  return [
    `Mechanic: ${m?.label ?? mechanic} (${m?.slides[0]}-${m?.slides[1]} slides).`,
    MECHANIC_PLAYBOOK[mechanic] ?? "",
    `Feature: ${f?.label ?? feature}.`,
    `Feature facts (the only product claims you may make): ${FEATURE_FACTS[feature] ?? FEATURE_FACTS.none}`,
  ].join("\n");
}
