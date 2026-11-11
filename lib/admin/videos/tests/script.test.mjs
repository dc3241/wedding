import test from "node:test";
import assert from "node:assert/strict";
import {
  alignSegments, buildTimeline, checkVideoCopy, footageNeeds, footageScore, normalizeSegments, voiceText,
} from "../script.ts";

const segs = normalizeSegments([
  { id: "a", text: "Three mistakes hide in this timeline.", visual: { type: "text", highlight: ["Three"] } },
  { id: "p", text: "ignored", visual: { type: "pause", seconds: 4 } },
  { id: "b", text: "Here are the answers.", visual: { type: "cards", title: "T", items: [{ label: "x", correct: true }], numbered: false } },
]);

function fakeAlignment(text, perChar = 0.1) {
  const characters = [...text];
  return {
    characters,
    character_start_times_seconds: characters.map((_, i) => i * perChar),
    character_end_times_seconds: characters.map((_, i) => (i + 1) * perChar),
  };
}

test("normalize: pause drops text, ids unique", () => {
  assert.equal(segs[1].text, "");
  assert.equal(new Set(segs.map((s) => s.id)).size, 3);
});

test("voiceText joins spoken segments only", () => {
  assert.equal(voiceText(segs), "Three mistakes hide in this timeline. Here are the answers.");
});

test("align maps words to segments", () => {
  const al = alignSegments(segs, fakeAlignment(voiceText(segs)));
  assert.equal(al.segments.length, 2);
  assert.equal(al.segments[0].words[0].w, "Three");
  assert.equal(al.segments[0].words[0].s, 0);
  assert.equal(al.segments[1].words[0].w, "Here");
  assert.ok(al.segments[1].start > al.segments[0].end);
});

test("timeline: speed-up and pause shift", () => {
  const al = alignSegments(segs, fakeAlignment(voiceText(segs)));
  const tl = buildTimeline(segs, al, { speed: 1.1, hold: 1 });
  assert.equal(tl.pauses.length, 1);
  const aEnd = al.segments[0].end / 1.1;
  assert.ok(Math.abs(tl.pauses[0].at - aEnd) < 0.01);
  const b = tl.beats.find((x) => x.id === "b");
  assert.ok(Math.abs(b.start - (al.segments[1].start / 1.1 + 4)) < 0.01);
  assert.ok(tl.duration > b.start);
});

test("footage needs and matching", () => {
  const fs = normalizeSegments([{ id: "f", text: "Watch it work.", visual: { type: "footage", need: "assistant chat finding venues", clip_id: null } }]);
  assert.equal(footageNeeds(fs)[0].satisfied, false);
  const hit = footageScore("assistant chat finding venues", { title: "Assistant venues", description: "chat finding venues in Phoenix", tags: [], feature: "assistant_venue_search" }, "assistant_venue_search");
  const miss = footageScore("assistant chat finding venues", { title: "Seating", description: "drag guests to tables", tags: [], feature: "seating" }, "assistant_venue_search");
  assert.ok(hit > miss);
});

const body = "word ".repeat(100).trim();
const ok = {
  kind: "tip", mechanic: "tip", feature: "budget", title: "T", caption: "c", pinned_comment: "",
  segments: normalizeSegments([
    { id: "a", text: body, visual: { type: "text", highlight: [] } },
    { id: "z", text: 'Comment "Look" to get free access to the app that will keep your budget in check.', visual: { type: "cta", outcome: "keep your budget in check" } },
  ]),
};

test("copy check: valid tip passes; rules fire", () => {
  assert.deepEqual(checkVideoCopy(ok), []);
  assert.ok(checkVideoCopy({ ...ok, caption: "AI tool" }).some((i) => /AI/.test(i)));
  assert.ok(checkVideoCopy({ ...ok, segments: ok.segments.slice(0, 1) }).some((i) => /CTA/.test(i)));
  const engage = { ...ok, kind: "engage", mechanic: "quiz", caption: "comment below" };
  assert.ok(checkVideoCopy(engage).some((i) => /ask segment/.test(i)));
});
