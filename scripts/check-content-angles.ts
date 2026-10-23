import assert from "node:assert/strict";
import {
  copiesOverlap,
  familyKeysFor,
  pickLeastRecentTopics,
  repeatsShownCopy,
  retiredClaimFor,
  uniqueTexts,
} from "../lib/admin/content-angles";

const shownMyth =
  "Myth: 15 minutes of buffer is enough for the photo gap between the ceremony and reception. Fact: portraits almost always run long — plan for 45 minutes minimum and build the cocktail hour around keeping guests happy while you're still with your photographer.";

assert.equal(retiredClaimFor(shownMyth)?.id, "photo-gap-15-vs-45");
assert.equal(
  retiredClaimFor(
    "Fifteen minutes of buffer is enough for the photo gap. Give portraits forty-five minutes instead.",
  )?.id,
  "photo-gap-15-vs-45",
);
assert.equal(
  retiredClaimFor("Getting ready always starts late — put 30 minutes of slack before first look."),
  null,
);
assert.equal(
  retiredClaimFor("Plan the cocktail hour for the guests: a host, drinks, and something to do."),
  null,
);

assert.equal(
  copiesOverlap(
    shownMyth,
    "Myth: 15 min of buffer is enough between ceremony and reception. Fact: portraits run long, so plan 45 minutes.",
  ),
  true,
);
assert.equal(
  copiesOverlap(
    shownMyth,
    "Getting-ready runs long. Put slack before hair and makeup, not after the ceremony.",
  ),
  false,
);
assert.ok(repeatsShownCopy(shownMyth, [shownMyth]));
assert.ok(
  repeatsShownCopy(
    "Myth: 15 minutes of buffer is enough for the photo gap. Fact: plan 45 minutes for portraits.",
    [shownMyth],
  ),
);
assert.equal(
  repeatsShownCopy("Name who tells guests where to be after the ceremony.", [shownMyth]),
  false,
);

const gettingReady =
  "Getting-ready always starts late. Put slack before hair and makeup, not after vows.";
const cocktailHost =
  "Pain: guests standing around with nothing to do. Feature: plan the cocktail hour for them — a host, drinks, something to do.";
assert.equal(retiredClaimFor(gettingReady), null);
assert.equal(retiredClaimFor(cocktailHost), null);
assert.equal(repeatsShownCopy(gettingReady, [shownMyth]), false);
assert.equal(repeatsShownCopy(cocktailHost, [shownMyth]), false);
assert.ok(repeatsShownCopy(shownMyth, []));

assert.deepEqual(familyKeysFor("dayof-buffer").sort(), [
  "dayof-buffer",
  "timeline-photo-gap",
  "timeline-photos",
]);

const used = new Set<string>();
const picked = pickLeastRecentTopics(
  [
    { key: "dayof-buffer" },
    { key: "timeline-photo-gap" },
    { key: "budget-cuts" },
  ],
  1,
  used,
  ["dayof-buffer"],
);
assert.equal(picked[0]?.key, "budget-cuts");
assert.ok(used.has("budget-cuts"));
assert.equal(used.has("dayof-buffer"), false);
assert.equal(used.has("timeline-photo-gap"), false);

const familyUsed = new Set<string>();
pickLeastRecentTopics([{ key: "dayof-buffer" }, { key: "timeline-photos" }], 1, familyUsed, []);
assert.ok(familyUsed.has("dayof-buffer"));
assert.ok(familyUsed.has("timeline-photos"));
assert.ok(familyUsed.has("timeline-photo-gap"));

const oldest = pickLeastRecentTopics(
  [{ key: "morning-of" }, { key: "week-before" }, { key: "headcount" }],
  1,
  new Set<string>(),
  ["morning-of", "week-before"],
);
assert.equal(oldest[0]?.key, "headcount");

assert.deepEqual(uniqueTexts([shownMyth, `  ${shownMyth}  `, "A different hook."], 10), [
  shownMyth,
  "A different hook.",
]);

console.log("check-content-angles: ok");
