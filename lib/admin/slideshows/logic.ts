/**
 * Slideshow batch logic. Pure functions only: no imports, no I/O, so the
 * rotation, scoring, and copy rules can be tested with `node --test`.
 *
 *   - angle model: every post has a kind (tip | engage | promo), a mechanic
 *     (quiz, vote, ...), and a feature (what part of the app it is about).
 *     feature + mechanic is the "angle key".
 *   - rotation: an angle key that ran in the last COOLDOWN_BATCHES batches is
 *     not picked again.
 *   - performance: logged results turn into a score per post (comments per
 *     1,000 views first, then clicks and signups). Posts with no results or
 *     zero views are ignored until Dom updates them.
 *   - rules: copy checks that mirror the standing content rules.
 */

// ---------------------------------------------------------------------------
// Angle model
// ---------------------------------------------------------------------------

export const POST_KINDS = ["tip", "engage", "promo"] as const;
export type PostKind = (typeof POST_KINDS)[number];

export type Mechanic = {
  key: string;
  kind: PostKind;
  label: string;
  /** Slides, including the ask slide. */
  slides: [number, number];
  /** Features this mechanic may use. Absent means any feature. */
  onlyFeatures?: readonly string[];
};

export const MECHANICS: readonly Mechanic[] = [
  { key: "tip", kind: "tip", label: "Tip", slides: [5, 7] },
  { key: "promo", kind: "promo", label: "Feature promo", slides: [5, 6] },
  { key: "quiz", kind: "engage", label: "Quiz: find the mistakes", slides: [6, 7] },
  { key: "vote", kind: "engage", label: "Hot take: vote 1 or 2", slides: [5, 6] },
  { key: "ranking", kind: "engage", label: "Rank these", slides: [5, 6] },
  { key: "myth_truth", kind: "engage", label: "Myth or truth", slides: [5, 6] },
  { key: "story_ask", kind: "engage", label: "Scenario: what would you do?", slides: [5, 6] },
  {
    key: "comment_to_run",
    kind: "engage",
    label: "Comment to run",
    slides: [6, 6],
    onlyFeatures: ["assistant_venue_search", "assistant_open_vendors"],
  },
];

export const MECHANIC_BY_KEY = new Map(MECHANICS.map((m) => [m.key, m]));

export type Feature = { key: string; label: string; assistant: boolean };

export const FEATURES: readonly Feature[] = [
  { key: "assistant_venue_search", label: "Assistant: finds venues and drafts pricing requests", assistant: true },
  { key: "assistant_open_vendors", label: "Assistant: drafts outreach for vendor categories still open", assistant: true },
  { key: "assistant_ask", label: "Assistant: ask it about your checklist, budget, guests, vendors", assistant: true },
  { key: "budget", label: "Budget tracker", assistant: false },
  { key: "guests", label: "Guest list and RSVPs", assistant: false },
  { key: "seating", label: "Seating chart", assistant: false },
  { key: "timeline", label: "Day-of timeline", assistant: false },
  { key: "vendors", label: "Vendor tracking", assistant: false },
  { key: "checklist", label: "Checklist", assistant: false },
  { key: "website", label: "Wedding website", assistant: false },
  { key: "none", label: "No product (pure value)", assistant: false },
];

export const FEATURE_BY_KEY = new Map(FEATURES.map((f) => [f.key, f]));

/** An angle that ran in this many recent batches rests. */
export const COOLDOWN_BATCHES = 4;
/** Same feature in one batch is capped so a batch is not one topic. */
export const MAX_PER_FEATURE_PER_BATCH = 2;
/** Same engagement mechanic in one batch (tips and promos are the generic types and are exempt). */
export const MAX_PER_MECHANIC_PER_BATCH = 2;

export function angleKey(feature: string, mechanic: string): string {
  return `${feature}:${mechanic}`;
}

export function isAllowedCombo(feature: string, mechanic: string): boolean {
  const m = MECHANIC_BY_KEY.get(mechanic);
  if (!m || !FEATURE_BY_KEY.has(feature)) return false;
  if (m.onlyFeatures && !m.onlyFeatures.includes(feature)) return false;
  if (m.kind === "promo" && feature === "none") return false;
  return true;
}

export function allCombos(kind: PostKind): { feature: string; mechanic: string }[] {
  const out: { feature: string; mechanic: string }[] = [];
  for (const m of MECHANICS) {
    if (m.kind !== kind) continue;
    for (const f of FEATURES) {
      if (isAllowedCombo(f.key, m.key)) out.push({ feature: f.key, mechanic: m.key });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Performance scoring
// ---------------------------------------------------------------------------

export type ResultLite = {
  views: number | null;
  likes?: number | null;
  comments: number | null;
  shares?: number | null;
  saves?: number | null;
  link_clicks?: number | null;
  signups?: number | null;
};

/**
 * Weights per action, per 1,000 views. Comments lead because comments are
 * the goal; clicks and signups are the point of the comments, so they count
 * more per unit. Saves and shares are a small tiebreak.
 */
export const SCORE_WEIGHTS = {
  comments: 1,
  link_clicks: 2,
  signups: 6,
  saves: 0.25,
  shares: 0.25,
} as const;

/** A post counts only once it has views. No results or zero views: ignored. */
export function hasUsableResult(r: ResultLite | null | undefined): r is ResultLite {
  return Boolean(r && typeof r.views === "number" && r.views > 0);
}

export function postScore(r: ResultLite): number | null {
  if (!hasUsableResult(r)) return null;
  const views = r.views as number;
  const per1k = (n: number | null | undefined) => ((n ?? 0) / views) * 1000;
  return (
    SCORE_WEIGHTS.comments * per1k(r.comments) +
    SCORE_WEIGHTS.link_clicks * per1k(r.link_clicks) +
    SCORE_WEIGHTS.signups * per1k(r.signups) +
    SCORE_WEIGHTS.saves * per1k(r.saves) +
    SCORE_WEIGHTS.shares * per1k(r.shares)
  );
}

export type ScoredPost = {
  id: string;
  kind: string;
  mechanic: string;
  feature: string;
  angle_key: string;
  title: string;
  views: number;
  comments: number;
  link_clicks: number;
  signups: number;
  saves: number;
  score: number;
  commentsPer1k: number;
};

export type PostWithResult = {
  id: string;
  kind: string;
  mechanic: string;
  feature: string;
  angle_key: string;
  title: string;
  result: ResultLite | null;
};

export function scorePosts(posts: readonly PostWithResult[]): ScoredPost[] {
  const out: ScoredPost[] = [];
  for (const p of posts) {
    const score = postScore(p.result as ResultLite);
    if (score === null || !p.result) continue;
    const views = p.result.views as number;
    out.push({
      id: p.id,
      kind: p.kind,
      mechanic: p.mechanic,
      feature: p.feature,
      angle_key: p.angle_key,
      title: p.title,
      views,
      comments: p.result.comments ?? 0,
      link_clicks: p.result.link_clicks ?? 0,
      signups: p.result.signups ?? 0,
      saves: p.result.saves ?? 0,
      score,
      commentsPer1k: ((p.result.comments ?? 0) / views) * 1000,
    });
  }
  return out;
}

export type GroupStat = {
  key: string;
  n: number;
  views: number;
  avgScore: number;
  avgCommentsPer1k: number;
  signups: number;
  linkClicks: number;
};

export function groupStats(scored: readonly ScoredPost[], pick: (p: ScoredPost) => string): GroupStat[] {
  const groups = new Map<string, ScoredPost[]>();
  for (const p of scored) {
    const key = pick(p);
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }
  return [...groups.entries()]
    .map(([key, list]) => ({
      key,
      n: list.length,
      views: list.reduce((a, p) => a + p.views, 0),
      avgScore: list.reduce((a, p) => a + p.score, 0) / list.length,
      avgCommentsPer1k: list.reduce((a, p) => a + p.commentsPer1k, 0) / list.length,
      signups: list.reduce((a, p) => a + p.signups, 0),
      linkClicks: list.reduce((a, p) => a + p.link_clicks, 0),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

/** Shrinks a small sample toward the overall mean so one viral post does not run the show. */
const SHRINK_K = 2;
const MIN_WEIGHT = 0.25;
const MAX_WEIGHT = 3;
/** A group nobody has tried yet still gets picked sometimes. */
const EXPLORE_WEIGHT = 1.5;

export function dimensionWeights(
  scored: readonly ScoredPost[],
  options: readonly string[],
  pick: (p: ScoredPost) => string,
): Map<string, number> {
  const weights = new Map<string, number>();
  const overall = scored.length ? scored.reduce((a, p) => a + p.score, 0) / scored.length : 0;
  const stats = new Map(groupStats(scored, pick).map((g) => [g.key, g]));
  for (const key of options) {
    const g = stats.get(key);
    if (!g) {
      weights.set(key, EXPLORE_WEIGHT);
      continue;
    }
    if (overall <= 0) {
      weights.set(key, 1);
      continue;
    }
    const est = (g.avgScore * g.n + overall * SHRINK_K) / (g.n + SHRINK_K);
    weights.set(key, Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, est / overall)));
  }
  return weights;
}

/**
 * Engagement share for the next batch. Starts at the setting, then moves up to
 * ±0.2 toward whichever side (tip vs engage) is scoring better, once each side
 * has at least MIN_SCORED_PER_SIDE scored posts. Clamped to 0.3–0.7.
 */
export const MIN_SCORED_PER_SIDE = 3;

export function adaptiveEngagementShare(base: number, scored: readonly ScoredPost[]): number {
  const eng = scored.filter((p) => p.kind === "engage");
  const rest = scored.filter((p) => p.kind !== "engage");
  if (eng.length < MIN_SCORED_PER_SIDE || rest.length < MIN_SCORED_PER_SIDE) return clampShare(base);
  const e = eng.reduce((a, p) => a + p.score, 0) / eng.length;
  const r = rest.reduce((a, p) => a + p.score, 0) / rest.length;
  const total = e + r;
  if (total <= 0) return clampShare(base);
  const lean = (e - r) / total; // -1..1
  return clampShare(base + lean * 0.2);
}

function clampShare(value: number): number {
  return Math.min(0.7, Math.max(0.3, value));
}

// ---------------------------------------------------------------------------
// Rotation and slot selection
// ---------------------------------------------------------------------------

export type HistoryPost = { angle_key: string; feature: string; batchesAgo: number };

/** Angle keys that rest: they ran in the last `cooldown` batches. */
export function restingAngles(history: readonly HistoryPost[], cooldown = COOLDOWN_BATCHES): Set<string> {
  const out = new Set<string>();
  for (const h of history) if (h.batchesAgo < cooldown) out.add(h.angle_key);
  return out;
}

export type Slot = { kind: PostKind; mechanic: string; feature: string; angle_key: string };

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick<T>(items: readonly T[], weight: (item: T) => number, rng: () => number): T | null {
  if (items.length === 0) return null;
  const weights = items.map((i) => Math.max(0, weight(i)));
  const total = weights.reduce((a, w) => a + w, 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)] ?? null;
  let roll = rng() * total;
  for (let i = 0; i < items.length; i += 1) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return items[i] ?? null;
  }
  return items[items.length - 1] ?? null;
}

export type PlanInput = {
  count: number;
  engagementShare: number;
  history: readonly HistoryPost[];
  scored: readonly ScoredPost[];
  rng?: () => number;
  /** Promo posts per batch (the non-engage side). Default 1 when the tip side has 4+ slots. */
  promoCount?: number;
};

export function splitCounts(count: number, share: number, promoCount?: number) {
  const engage = Math.min(count - 1, Math.max(1, Math.round(count * share)));
  const rest = count - engage;
  const promo = promoCount ?? (rest >= 4 ? 1 : 0);
  return { engage, tip: rest - Math.min(promo, rest), promo: Math.min(promo, rest) };
}

/**
 * Chooses (kind, mechanic, feature) for every slot in a batch.
 * Respects the cooldown, the per-batch caps, and the allowed combos; weights
 * mechanics and features by how they have performed. If the cooldown leaves
 * too few options, it relaxes the per-feature cap first, then the cooldown for
 * the oldest-ago angles, so a batch always fills.
 */
export function planSlots(input: PlanInput): Slot[] {
  const rng = input.rng ?? Math.random;
  const share = adaptiveEngagementShare(input.engagementShare, input.scored);
  const { engage, tip, promo } = splitCounts(input.count, share, input.promoCount);
  const wanted: PostKind[] = [
    ...Array<PostKind>(engage).fill("engage"),
    ...Array<PostKind>(tip).fill("tip"),
    ...Array<PostKind>(promo).fill("promo"),
  ];

  const mechWeights = dimensionWeights(
    input.scored,
    MECHANICS.map((m) => m.key),
    (p) => p.mechanic,
  );
  const featureWeights = dimensionWeights(
    input.scored,
    FEATURES.map((f) => f.key),
    (p) => p.feature,
  );

  const picked: Slot[] = [];
  const usedKeys = new Set<string>();
  const perFeature = new Map<string, number>();
  const perMechanic = new Map<string, number>();

  for (const kind of wanted) {
    const combos = allCombos(kind);
    let cooldown = COOLDOWN_BATCHES;
    let featureCap = MAX_PER_FEATURE_PER_BATCH;
    let slot: Slot | null = null;
    // Relax in order: feature cap, then cooldown one batch at a time. Never
    // reuse an angle key inside the same batch.
    for (let attempt = 0; attempt < 2 + COOLDOWN_BATCHES && !slot; attempt += 1) {
      const resting = restingAngles(input.history, cooldown);
      const pool = combos.filter((c) => {
        const key = angleKey(c.feature, c.mechanic);
        if (usedKeys.has(key) || resting.has(key)) return false;
        if (c.feature !== "none" && (perFeature.get(c.feature) ?? 0) >= featureCap) return false;
        if (kind === "engage" && (perMechanic.get(c.mechanic) ?? 0) >= MAX_PER_MECHANIC_PER_BATCH) return false;
        return true;
      });
      const choice = weightedPick(
        pool,
        (c) => (mechWeights.get(c.mechanic) ?? 1) * (featureWeights.get(c.feature) ?? 1),
        rng,
      );
      if (choice) {
        slot = { kind, mechanic: choice.mechanic, feature: choice.feature, angle_key: angleKey(choice.feature, choice.mechanic) };
      } else if (attempt === 0) {
        featureCap += 1;
      } else if (cooldown > 1) {
        cooldown -= 1;
      } else {
        featureCap += 1;
      }
    }
    if (!slot) continue;
    picked.push(slot);
    usedKeys.add(slot.angle_key);
    perFeature.set(slot.feature, (perFeature.get(slot.feature) ?? 0) + 1);
    perMechanic.set(slot.mechanic, (perMechanic.get(slot.mechanic) ?? 0) + 1);
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Copy rules
// ---------------------------------------------------------------------------

export type CopySlide = { layout: string; headline: string; support?: string; text: string };

export type CopyPost = {
  kind: PostKind;
  mechanic: string;
  feature: string;
  title: string;
  caption: string;
  pinned_comment: string;
  slides: CopySlide[];
};

const AI_WORD = /\bA\.?I\.?\b|artificial intelligence|\bAI-/i;
const PRICING_CLAIM =
  /\b(fits?|within|under|inside|matches?)\s+(your|the|any)\s+budget\b|\b(returns?|shows?|compares?|lists?|finds?|pulls?)\s+(you\s+)?(venue\s+|vendor\s+)?(prices?|pricing|quotes?|costs?)\b|\bcheapest\b|\bbest (prices?|deals?)\b|\bwithin budget\b/i;
const MADE_UP_STATS =
  /\b\d{1,3}\s?%|\bstud(y|ies) (show|found|say)|\bstatistics?\b|\bon average\b|\bthe average (couple|wedding)\b|\bmost couples (spend|pay)\b|\bresearch (shows|says)\b/i;
const TESTIMONIAL =
  /\b(our (customers|users|couples) (say|love|told us)|one (couple|bride|groom) told us|a (bride|couple) told us|testimonial|reviews? (say|from))\b/i;
const FIRST_LOOK = /first\s?look/gi;

export function postText(post: CopyPost): string {
  return [post.title, post.caption, post.pinned_comment, ...post.slides.map((s) => s.text)].join("\n");
}

export function checkPostCopy(post: CopyPost): string[] {
  const issues: string[] = [];
  const all = postText(post);
  const slideText = post.slides.map((s) => s.text).join("\n");
  const feature = FEATURE_BY_KEY.get(post.feature);
  const mech = MECHANIC_BY_KEY.get(post.mechanic);

  if (!mech) issues.push(`unknown mechanic ${post.mechanic}`);
  if (!feature) issues.push(`unknown feature ${post.feature}`);
  if (mech && feature && !isAllowedCombo(post.feature, post.mechanic)) {
    issues.push(`${post.mechanic} cannot use ${post.feature}`);
  }
  if (mech && (post.slides.length < mech.slides[0] || post.slides.length > mech.slides[1])) {
    issues.push(`${post.mechanic} needs ${mech.slides[0]}-${mech.slides[1]} slides, got ${post.slides.length}`);
  }
  if (AI_WORD.test(all)) issues.push('mentions "AI"; say assistant or automatically');
  if (MADE_UP_STATS.test(all)) issues.push("states a statistic or average that cannot be sourced");
  if (TESTIMONIAL.test(all)) issues.push("implies a testimonial or customer quote");
  if (feature?.assistant && PRICING_CLAIM.test(all)) {
    issues.push("claims the assistant returns pricing or fits a budget (it drafts requests for pricing; it does not pull prices)");
  }
  if ((slideText.match(FIRST_LOOK) ?? []).length > 1) issues.push("names First Look more than once on the slides");
  if (post.kind === "engage") {
    if (!post.slides.some((s) => s.layout === "ask")) issues.push("engagement post needs an ask slide");
    if (!/comment/i.test(post.caption)) issues.push("engagement caption must ask for a comment");
    if (!post.pinned_comment.trim()) issues.push("engagement post needs a pinned comment");
  }
  if (post.mechanic === "quiz" && !/answer/i.test(post.pinned_comment + post.slides.map((s) => s.text).join(" "))) {
    issues.push("quiz needs answers");
  }
  const first = post.slides[0];
  if (first && AI_WORD.test(first.text)) issues.push("hook slide mentions AI");
  if (!post.title.trim()) issues.push("missing title");
  return issues;
}

/** UTM campaign for a post, following the angle-test scheme: <angle>-<format>. */
export function utmCampaign(mechanic: string, feature: string): string {
  return `${mechanic}-${feature}-slideshow`.replace(/_/g, "-");
}

/** Index of each batch, newest first: id -> batchesAgo (0 = the latest batch). */
export function batchesAgoMap(batchIdsNewestFirst: readonly string[]): Map<string, number> {
  return new Map(batchIdsNewestFirst.map((id, i) => [id, i]));
}

// ---------------------------------------------------------------------------
// Plain-language performance notes (fed to the generator and the summary)
// ---------------------------------------------------------------------------

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

function fmt(n: number): string {
  return n >= 10 ? n.toFixed(0) : n.toFixed(1);
}

/**
 * Short notes on what is and is not working. Only scored posts count: a post
 * with no logged results (or zero views) is left out until Dom updates it.
 */
export function describePerformance(scored: readonly ScoredPost[], minPerGroup = 1): string {
  if (scored.length === 0) return "";
  const lines: string[] = [];
  const overall = scored.reduce((a, p) => a + p.commentsPer1k, 0) / scored.length;
  lines.push(`Across ${scored.length} logged posts, the average is ${fmt(overall)} comments per 1,000 views.`);
  const section = (label: string, pick: (p: ScoredPost) => string, names: (k: string) => string) => {
    const groups = groupStats(scored, pick).filter((g) => g.n >= minPerGroup);
    if (groups.length === 0) return;
    lines.push(
      `${label}, best first: ` +
        groups
          .map((g) => `${names(g.key)} (${g.n} post${g.n === 1 ? "" : "s"}, ${fmt(g.avgCommentsPer1k)} comments/1k views${g.signups ? `, ${g.signups} signups` : ""})`)
          .join("; ") +
        ".",
    );
  };
  section("By type", (p) => p.kind, (k) => k);
  section("By mechanic", (p) => p.mechanic, (k) => MECHANIC_BY_KEY.get(k)?.label ?? k);
  section("By feature", (p) => p.feature, (k) => FEATURE_BY_KEY.get(k)?.label ?? k);
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, 3);
  const bottom = ranked.length > 3 ? ranked.slice(-2) : [];
  if (top.length) lines.push(`Top posts: ${top.map((p) => `"${p.title}" (${fmt(p.commentsPer1k)}/1k)`).join("; ")}.`);
  if (bottom.length) lines.push(`Weakest posts: ${bottom.map((p) => `"${p.title}" (${fmt(p.commentsPer1k)}/1k)`).join("; ")}.`);
  return lines.join("\n");
}

/** YYYY-MM-DD of the Monday on or before the given YYYY-MM-DD. */
export function mondayOnOrBefore(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y as number, (m as number) - 1, d));
  const dow = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return date.toISOString().slice(0, 10);
}
