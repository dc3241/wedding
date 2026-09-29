import fs from "node:fs/promises";
import { renderSatoriSlide } from "../lib/admin/content-queue/satori-slide";
import { surfaceData } from "../lib/admin/content-queue/surface-data";
import type { SlideSpec } from "../lib/admin/content-queue/slide-spec";

const card: SlideSpec = {
  format: "pin",
  layout: "headline-card",
  theme: "blush",
  headline: "RSVP chasing, officially retired.",
  support: "Know who's in, who's waiting, and who needs a nudge.",
  cta: true,
  data: {
    tabs: ["Guests", "Meals", "Seating"],
    rows: [
      { label: "Attending", status: "93", tone: "good" },
      { label: "Pending", status: "43", tone: "warn" },
      { label: "Declined", status: "4", tone: "bad" },
      { label: "People", status: "140", tone: "neutral" },
    ],
  },
};

const phone: SlideSpec = {
  format: "pin",
  layout: "headline-phone",
  theme: "blush",
  headline: "Budgeting, without the guesswork.",
  support: "Every vendor quote, deposit, and due date in one place.",
  cta: true,
  surface: "budget",
  data: surfaceData("budget") ?? {},
};

async function main() {
  await fs.mkdir("stills/satori-check", { recursive: true });
  for (const [name, spec] of [
    ["headline-card-blush-pin.png", card],
    ["headline-phone-blush-pin.png", phone],
  ] as const) {
    try {
      await fs.writeFile(`stills/satori-check/${name}`, await renderSatoriSlide(spec));
      console.log("wrote", name);
    } catch (err) {
      console.error("failed", name, err);
      process.exitCode = 1;
    }
  }
}

main();
