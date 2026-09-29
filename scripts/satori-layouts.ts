import fs from "node:fs/promises";
import { renderSatoriSlide } from "../lib/admin/content-queue/satori-slide";
import type { SlideFormat, SlideLayout, SlideSpec, SlideTheme } from "../lib/admin/content-queue/slide-spec";

const themes: SlideTheme[] = ["blush", "white", "ink", "rose", "sage"];
const formats: SlideFormat[] = ["pin", "tiktok"];
const layouts: SlideLayout[] = ["statement", "tip-list", "before-after", "steps", "big-number"];

const copy: Record<(typeof layouts)[number], Omit<SlideSpec, "format" | "theme">> = {
  statement: {
    format: "pin",
    layout: "statement",
    theme: "blush",
    headline: "Your seating chart shouldn\u2019t live on a sticky note.",
    support: "Build it once, share it with your venue.",
    data: { highlight: "sticky note" },
  },
  "tip-list": {
    format: "pin",
    layout: "tip-list",
    theme: "blush",
    headline: "3 things to confirm with every vendor two weeks out.",
    cta: false,
    data: {
      tips: [
        { title: "Final headcount", body: "Caterers bill on it. Lock it in writing." },
        { title: "Arrival and setup time", body: "Know when they load in, not just when they start." },
        { title: "Balance due date", body: "So the last payment never surprises you." },
      ],
    },
  },
  "before-after": {
    format: "pin",
    layout: "before-after",
    theme: "blush",
    headline: "Planning, before and after.",
    support: "Same wedding. Fewer group chats.",
    data: {
      beforeTitle: "Before",
      before: ["Texting guests for RSVPs", "A spreadsheet per vendor", "Sticky notes for seating"],
      afterTitle: "With First Look",
      after: ["One guest list, live statuses", "Every quote and deposit tracked", "Drag-and-drop seating"],
    },
  },
  steps: {
    format: "pin",
    layout: "steps",
    theme: "blush",
    headline: "Build your seating chart without a single sticky note.",
    data: {
      steps: [
        { word: "Drag.", caption: "Pull guests from your list." },
        { word: "Drop.", caption: "Place them at any table." },
        { word: "Done.", caption: "Share the floor plan with your venue." },
      ],
    },
  },
  "big-number": {
    format: "pin",
    layout: "big-number",
    theme: "blush",
    headline: "until your florist deposit is due.",
    support: "See every payment date before it sneaks up on you.",
    data: { value: "17 days" },
  },
};

async function main() {
  const dir = "stills/satori-check/layouts";
  await fs.mkdir(dir, { recursive: true });
  const only = process.argv[2];
  let failed = 0;
  for (const layout of layouts) {
    for (const theme of themes) {
      for (const format of formats) {
        const name = `${layout}-${theme}-${format}.png`;
        if (only && !name.startsWith(only)) continue;
        const spec: SlideSpec = { ...copy[layout], layout, theme, format };
        try {
          await fs.writeFile(`${dir}/${name}`, await renderSatoriSlide(spec));
          console.log("wrote", name);
        } catch (err) {
          failed += 1;
          console.error("failed", name, err instanceof Error ? err.message : err);
        }
      }
    }
  }
  if (failed > 0) process.exitCode = 1;
}

main();
