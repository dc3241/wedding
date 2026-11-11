import test from "node:test";
import assert from "node:assert/strict";
import {
  planSlots, restingAngles, angleKey, postScore, scorePosts, dimensionWeights, adaptiveEngagementShare,
  checkPostCopy, splitCounts, mulberry32, isAllowedCombo, COOLDOWN_BATCHES, MECHANICS,
} from "../logic.ts";

const rng = () => mulberry32(42);

test("splitCounts: 10 posts at 50% = 5 engage, 4 tip, 1 promo", () => {
  assert.deepEqual(splitCounts(10, 0.5), { engage: 5, tip: 4, promo: 1 });
  assert.deepEqual(splitCounts(4, 0.5), { engage: 2, tip: 2, promo: 0 });
});

test("a batch fills 10 slots with no repeated angle and respects caps", () => {
  const slots = planSlots({ count: 10, engagementShare: 0.5, history: [], scored: [], rng: rng() });
  assert.equal(slots.length, 10);
  assert.equal(new Set(slots.map((s) => s.angle_key)).size, 10);
  assert.equal(slots.filter((s) => s.kind === "engage").length, 5);
  const perFeature = {};
  for (const s of slots) if (s.feature !== "none") perFeature[s.feature] = (perFeature[s.feature] ?? 0) + 1;
  assert.ok(Object.values(perFeature).every((n) => n <= 2));
  for (const s of slots) assert.ok(isAllowedCombo(s.feature, s.mechanic));
});

test("angles from the last 4 batches rest; older ones are free", () => {
  const history = [
    { angle_key: "assistant_venue_search:comment_to_run", feature: "assistant_venue_search", batchesAgo: 0 },
    { angle_key: "timeline:quiz", feature: "timeline", batchesAgo: 3 },
    { angle_key: "budget:vote", feature: "budget", batchesAgo: 4 },
  ];
  const resting = restingAngles(history);
  assert.ok(resting.has("assistant_venue_search:comment_to_run"));
  assert.ok(resting.has("timeline:quiz"));
  assert.ok(!resting.has("budget:vote"));
  for (let seed = 1; seed <= 50; seed += 1) {
    const slots = planSlots({ count: 10, engagementShare: 0.5, history, scored: [], rng: mulberry32(seed) });
    assert.ok(!slots.some((s) => s.angle_key === "assistant_venue_search:comment_to_run"));
    assert.ok(!slots.some((s) => s.angle_key === "timeline:quiz"));
  }
});

test("comment_to_run only appears with assistant features", () => {
  assert.ok(isAllowedCombo("assistant_venue_search", "comment_to_run"));
  assert.ok(!isAllowedCombo("budget", "comment_to_run"));
  for (let seed = 1; seed <= 50; seed += 1) {
    for (const s of planSlots({ count: 10, engagementShare: 0.5, history: [], scored: [], rng: mulberry32(seed) })) {
      if (s.mechanic === "comment_to_run") assert.ok(s.feature.startsWith("assistant_"));
    }
  }
});

test("a post with no views or no result is ignored", () => {
  assert.equal(postScore({ views: 0, comments: 9 }), null);
  assert.equal(postScore({ views: null, comments: 9 }), null);
  const scored = scorePosts([
    { id: "a", kind: "engage", mechanic: "quiz", feature: "timeline", angle_key: "timeline:quiz", title: "t", result: null },
    { id: "b", kind: "engage", mechanic: "quiz", feature: "timeline", angle_key: "timeline:quiz", title: "t", result: { views: 0, comments: 4 } },
    { id: "c", kind: "engage", mechanic: "quiz", feature: "timeline", angle_key: "timeline:quiz", title: "t", result: { views: 1000, comments: 10 } },
  ]);
  assert.equal(scored.length, 1);
  assert.equal(scored[0].commentsPer1k, 10);
});

test("comments per 1,000 views lead, signups weigh most per unit", () => {
  const a = postScore({ views: 1000, comments: 10 });
  const b = postScore({ views: 1000, comments: 5, signups: 2 });
  assert.ok(b > a);
});

test("weights favor what works, still explore what is untried", () => {
  const scored = [];
  const mk = (mechanic, views, comments, i) =>
    scored.push(...scorePosts([{ id: `${mechanic}${i}`, kind: "engage", mechanic, feature: "x", angle_key: `x:${mechanic}`, title: "t", result: { views, comments } }]));
  for (let i = 0; i < 3; i += 1) { mk("quiz", 1000, 20, i); mk("vote", 1000, 2, i); }
  const w = dimensionWeights(scored, ["quiz", "vote", "ranking"], (p) => p.mechanic);
  assert.ok(w.get("quiz") > w.get("vote"));
  assert.equal(w.get("ranking"), 1.5);
});

test("adaptive share moves toward the better side, within bounds", () => {
  const mk = (kind, comments, i) => scorePosts([{ id: `${kind}${i}`, kind, mechanic: kind, feature: "x", angle_key: `x:${kind}${i}`, title: "t", result: { views: 1000, comments } }])[0];
  const engageWins = [0, 1, 2].flatMap((i) => [mk("engage", 30, i), mk("tip", 3, i)]);
  const share = adaptiveEngagementShare(0.5, engageWins);
  assert.ok(share > 0.5 && share <= 0.7);
  assert.equal(adaptiveEngagementShare(0.5, []), 0.5);
});

const baseSlides = (n, extra = []) => [
  ...Array.from({ length: n - 1 }, (_, i) => ({ layout: "statement", headline: `Slide ${i + 1}`, text: `Slide ${i + 1}` })),
  { layout: "ask", headline: "Comment 1 or 2", text: "Comment 1 or 2", ...extra[0] },
];

test("rules: AI, pricing claims, stats, testimonials, missing ask are caught", () => {
  const ok = {
    kind: "engage", mechanic: "vote", feature: "budget", title: "Cut one", caption: "Comment 1 or 2 below",
    pinned_comment: "Comment 1 or 2. Why?", slides: baseSlides(5),
  };
  assert.deepEqual(checkPostCopy(ok), []);
  assert.ok(checkPostCopy({ ...ok, caption: "Our AI plans your day. Comment" }).some((i) => i.includes("AI")));
  assert.ok(checkPostCopy({ ...ok, caption: "Comment below, 60% of couples overspend" }).some((i) => i.includes("statistic")));
  assert.ok(checkPostCopy({ ...ok, caption: "Comment. One couple told us it saved them" }).some((i) => i.includes("testimonial")));
  assert.ok(checkPostCopy({ ...ok, caption: "Nice" }).some((i) => i.includes("comment")));
  assert.ok(checkPostCopy({ ...ok, slides: baseSlides(5).map((s) => ({ ...s, layout: "statement" })) }).some((i) => i.includes("ask slide")));
  const assistant = { ...ok, mechanic: "comment_to_run", feature: "assistant_venue_search", slides: baseSlides(6) };
  assert.deepEqual(checkPostCopy(assistant), []);
  assert.ok(checkPostCopy({ ...assistant, caption: "Comment and we find venues that fit your budget" }).some((i) => i.includes("pricing")));
  assert.ok(checkPostCopy({ ...assistant, slides: baseSlides(4) }).some((i) => i.includes("slides")));
});

test("cooldown constant is 4", () => assert.equal(COOLDOWN_BATCHES, 4));
test("mechanic list has all engage kinds", () => assert.ok(MECHANICS.filter((m) => m.kind === "engage").length >= 6));

import { describePerformance, mondayOnOrBefore } from "../logic.ts";
test("performance notes ignore unlogged posts and name what works", () => {
  assert.equal(describePerformance([]), "");
  const scored = scorePosts([
    { id: "1", kind: "engage", mechanic: "quiz", feature: "timeline", angle_key: "timeline:quiz", title: "Timeline quiz", result: { views: 1000, comments: 12 } },
    { id: "2", kind: "tip", mechanic: "tip", feature: "budget", angle_key: "budget:tip", title: "Budget tip", result: { views: 1000, comments: 1 } },
    { id: "3", kind: "tip", mechanic: "tip", feature: "guests", angle_key: "guests:tip", title: "Unlogged", result: { views: 0, comments: 0 } },
  ]);
  const text = describePerformance(scored);
  assert.match(text, /2 logged posts/);
  assert.match(text, /Quiz: find the mistakes/);
  assert.ok(!text.includes("Unlogged"));
});
test("monday on or before", () => {
  assert.equal(mondayOnOrBefore("2026-11-11"), "2026-11-09");
  assert.equal(mondayOnOrBefore("2026-11-15"), "2026-11-09");
  assert.equal(mondayOnOrBefore("2026-11-09"), "2026-11-09");
});
