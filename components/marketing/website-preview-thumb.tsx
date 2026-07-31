import type { WeddingWebsiteContent } from "@/components/website/types";
import { RomanceTemplate } from "@/components/website/templates/RomanceTemplate";

/** Static demo props for the marketing thumbnail — no persistence. */
const DEMO_CONTENT: WeddingWebsiteContent = {
  hero: {
    names: "Dom & Jordyn",
    date: "2027-02-13",
    tagline: "",
    showCountdown: false,
  },
  story: { heading: "Our Story", body: "", visible: false },
  details: {
    ceremonyVenue: "",
    ceremonyAddress: "",
    ceremonyTime: "",
    receptionVenue: "",
    receptionAddress: "",
    receptionTime: "",
    visible: false,
  },
  schedule: { items: [], visible: false },
  travel: { body: "", places: [], visible: false },
  gallery: { visible: false, images: [] },
  party: { visible: false, members: [] },
  faq: { visible: false, items: [] },
  registry: { visible: false },
  rsvp: { visible: false },
};

/**
 * Framed scale-down of the real Romance template so Cormorant stays in
 * `components/website/` (Tier 3). Non-interactive marketing chrome.
 *
 * RomanceTemplate's hero is min-h-[80vh] — far taller than this 118px window.
 * Preview-only: collapse that min-height so the hero sizes to its name/date
 * band, then nudge so that band sits in the clip (live sites untouched).
 */
export function WebsitePreviewThumb() {
  return (
    <div
      className="relative h-[118px] overflow-hidden rounded-[var(--radius-inner)] shadow-recessed [&_header]:!min-h-0"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 origin-top scale-[0.42] -translate-y-[56px]">
        <div className="w-[238%] -translate-x-[29%]">
          <RomanceTemplate content={DEMO_CONTENT} theme="blush" />
        </div>
      </div>
      <span className="absolute top-2 right-2 rounded-[var(--radius-pill)] bg-surface/75 px-2 py-0.5 text-[9px] font-semibold tracking-[0.06em] text-muted uppercase">
        Romance template
      </span>
    </div>
  );
}
