import assert from "node:assert/strict";
import { nextShuffleTheme, postGetsSnippet, selectSlideSpecs, shuffleSlideSpecs } from "../lib/admin/content-queue/select-slide";
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

function statement(headline: string) {
  return parseSlideFragment(
    { headline, support: "Keep the date.", layout: "statement", surface: "none", data: {} },
    headline,
  );
}

function headlineWith(show: boolean, base: string): string {
  for (let i = 0; i < 40; i += 1) {
    const headline = i === 0 ? base : `${base} ${i}`;
    if (postGetsSnippet([headline]) === show) return headline;
  }
  throw new Error(`no ${show ? "shown" : "plain"} headline for ${base}`);
}

const shownHeadline = headlineWith(true, "Leave a little buffer");
const plainHeadline = headlineWith(false, "Leave a little buffer");
const shown = selectSlideSpecs({
  platform: "pinterest",
  contentType: "A",
  fragments: [statement(shownHeadline)],
});
assert.equal(shown[0]?.layout, "statement");
assert.equal(typeof shown[0]?.snippet, "string");
const plain = selectSlideSpecs({
  platform: "pinterest",
  contentType: "A",
  fragments: [statement(plainHeadline)],
});
assert.equal(plain[0]?.snippet ?? null, null);

const rsvpHeadline = headlineWith(true, "The RSVP list can wait");
const rsvp = selectSlideSpecs({
  platform: "tiktok",
  contentType: "B",
  fragments: [statement(rsvpHeadline)],
});
assert.equal(rsvp[0]?.snippet, "guests");

const again = selectSlideSpecs({
  platform: "pinterest",
  contentType: "A",
  fragments: [statement(shownHeadline)],
  recent: [{ layout: "statement", theme: "ink", snippet: shown[0]?.snippet }],
});
assert.notEqual(again[0]?.snippet, shown[0]?.snippet);

const kept = shuffleSlideSpecs(shown, [], "A", "pinterest");
assert.equal(kept[0]?.snippet, shown[0]?.snippet);
assert.notEqual(kept[0]?.theme, shown[0]?.theme);

const packed = selectSlideSpecs({
  platform: "pinterest",
  contentType: "A",
  fragments: [
    parseSlideFragment(
      {
        headline: headlineWith(true, "Five things before you book"),
        support: "",
        layout: "tip-list",
        surface: "none",
        data: {
          tips: [
            { title: "Date", body: "Hold it." },
            { title: "Venue", body: "Tour two." },
            { title: "Count", body: "Guess high." },
            { title: "Style", body: "Pick one." },
            { title: "Budget", body: "Write it down." },
          ],
        },
      },
      "Five things",
    ),
  ],
});
assert.equal(packed[0]?.layout, "tip-list");
assert.equal(packed[0]?.snippet ?? null, null);

assert.equal(productSnippetCount(carousel), carouselGetsSnippet(carousel) ? 1 : 0);
assert.equal(carousel.find((spec) => spec.snippet)?.layout ?? "statement", "statement");

function productSnippetCount(specs: { snippet?: string | null }[]): number {
  return specs.filter((spec) => spec.snippet).length;
}
function carouselGetsSnippet(specs: { headline: string }[]): boolean {
  return postGetsSnippet(specs.map((spec) => spec.headline));
}

console.log("slide spec checks ok");
