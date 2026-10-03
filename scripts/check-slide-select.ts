import assert from "node:assert/strict";
import { nextShuffleTheme, selectSlideSpecs, shuffleSlideSpecs } from "../lib/admin/content-queue/select-slide";
import { parseSlideFragment, slidesFromModel } from "../lib/admin/content-queue/slide-spec";
import { pickWebsiteShot, surfaceData, surfaceLayout } from "../lib/admin/content-queue/surface-data";

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

const linkedin = selectSlideSpecs({
  platform: "linkedin",
  contentType: "D",
  fragments: [
    parseSlideFragment(
      {
        headline: "The inquiry should not live in an inbox.",
        support: "A lead with a next step.",
        layout: "headline-card",
        surface: "leads",
        data: {},
      },
      "fallback",
    ),
  ],
});
assert.equal(linkedin.length, 1);
assert.equal(linkedin[0]?.format, "square");
assert.equal(linkedin[0]?.layout, "headline-card");
assert.equal((linkedin[0]?.data as { rows?: unknown[] }).rows?.length, 2);

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

assert.equal(nextShuffleTheme("blush"), "ink");
assert.equal(nextShuffleTheme("ink"), "white");
assert.equal(nextShuffleTheme("white"), "rose");
assert.equal(nextShuffleTheme("rose"), "sage");
assert.equal(nextShuffleTheme("sage"), "blush");

const blushPin = selectSlideSpecs({
  platform: "pinterest",
  contentType: "D",
  fragments: [guest],
  recent: [],
});
assert.equal(blushPin[0]?.theme, "blush");
const once = shuffleSlideSpecs(blushPin, [], "D", "pinterest");
assert.equal(once[0]?.layout, "headline-card");
assert.equal(once[0]?.theme, "ink");
const twice = shuffleSlideSpecs(
  once,
  [{ layout: "headline-card", theme: "white" }],
  "D",
  "pinterest",
);
assert.equal(twice[0]?.theme, "white");

const shuffled = shuffleSlideSpecs(specs, [], "D", "pinterest");
assert.equal(shuffled[0]?.layout, "headline-card");
assert.equal(shuffled[0]?.theme, nextShuffleTheme(specs[0]?.theme));

const site = parseSlideFragment(
  {
    headline: "A site guests actually open.",
    support: "Schedule, travel, and RSVP.",
    layout: "headline-phone",
    surface: "website",
    data: {},
  },
  "fallback",
);
const siteSpecs = selectSlideSpecs({
  platform: "pinterest",
  contentType: "D",
  fragments: [site],
  recent: [{ layout: "headline-phone", theme: "white", shot: "where-when" }],
});
assert.equal(siteSpecs[0]?.layout, "headline-phone");
assert.equal((siteSpecs[0]?.data as { shot?: string }).shot, "timeline");
assert.equal(pickWebsiteShot(["where-when"], []), "timeline");
assert.equal(pickWebsiteShot(["where-when", "timeline"], []), "where-when");

const bad = parseSlideFragment({ headline: "Hi", layout: "tip-list", surface: "none", data: {} }, "Hi");
assert.equal(bad.degraded, true);
assert.equal(bad.layout, "statement");

console.log("slide spec checks ok");
