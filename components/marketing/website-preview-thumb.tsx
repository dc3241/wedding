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
  travel: { body: "", visible: false },
  registry: { links: [], visible: false },
  rsvp: { visible: false },
};

/**
 * Framed scale-down of the real Romance template so Cormorant stays in
 * `components/website/` (Tier 3). Non-interactive marketing chrome.
 */
export function WebsitePreviewThumb() {
  return (
    <div
      className="relative h-[118px] overflow-hidden rounded-[var(--radius-inner)] shadow-recessed"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-0 origin-top scale-[0.42]">
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
