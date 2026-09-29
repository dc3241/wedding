import assert from "node:assert/strict";
import { selectSlideSpecs, shuffleSlideSpecs } from "../lib/admin/content-queue/select-slide";
import { parseSlideFragment, slidesFromModel } from "../lib/admin/content-queue/slide-spec";
import { surfaceData, surfaceLayout } from "../lib/admin/content-queue/surface-data";

const budget = surfaceData("budget");
assert.equal(surfaceLayout("budget"), "headline-phone");
assert.equal(surfaceLayout("guests"), "headline-card");
assert.ok(budget && Array.isArray((budget as { bullets?: string[] }).bullets));
assert.equal((budget as { progress?: { pct: number } }).progress?.pct, 15);

const guest = parseSlideFragment(
  {
    headline: "RSVP chasing, officially retired.",
    support: "Know who is in.",
    layout: "headline-phone",
    surface: "guests",
    data: {},
  },
  "fallback",
);
assert.equal(guest.degraded, false);
assert.equal(guest.surface, "guests");

const specs = selectSlideSpecs({
  platform: "pinterest",
  contentType: "D",
  fragments: [guest],
  recent: [{ layout: "headline-card", theme: "blush" }],
});
assert.equal(specs.length, 1);
assert.equal(specs[0]?.format, "pin");
assert.equal(specs[0]?.layout, "headline-card");
assert.notEqual(specs[0]?.theme, "blush");
assert.equal((specs[0]?.data as { rows?: unknown[] }).rows?.length, 4);

const tip = slidesFromModel(
  [
    {
      headline: "Give every deposit a buffer.",
      support: "",
      layout: "tip-list",
      surface: "none",
      data: {
        tips: [
          { title: "Final headcount", body: "Lock it in writing." },
          { title: "Arrival time", body: "Know when they load in." },
        ],
      },
    },
    {
      headline: "Then the list keeps itself.",
      support: "",
      layout: "statement",
      surface: "guests",
      data: {},
    },
  ],
  2,
  "RSVPs",
);
assert.equal(tip.degraded, false);
const carousel = selectSlideSpecs({
  platform: "tiktok",
  contentType: "C",
  fragments: tip.fragments,
  recent: [],
});
assert.equal(carousel.length, 2);
assert.equal(carousel[0]?.format, "tiktok");
assert.equal(carousel[0]?.layout, "statement");
assert.equal(carousel[0]?.cta, false);
assert.equal(carousel[1]?.layout, "headline-card");
assert.equal(carousel[1]?.cta, true);
assert.equal(carousel[0]?.theme, carousel[1]?.theme);

const shuffled = shuffleSlideSpecs(specs, [], "D", "pinterest");
assert.equal(shuffled[0]?.layout, "headline-card");
assert.notEqual(shuffled[0]?.theme, specs[0]?.theme);

const bad = parseSlideFragment({ headline: "Hi", layout: "tip-list", surface: "none", data: {} }, "Hi");
assert.equal(bad.degraded, true);
assert.equal(bad.layout, "statement");

console.log("slide spec checks ok");
