import { WeddingSiteView } from "@/components/website/WeddingSiteView";
import type { WeddingWebsiteContent } from "@/components/website/types";
import { formatWeddingDate } from "@/components/website/template-utils";
import { weddingTemplateOptions } from "@/components/website/templates/registry";

const DEMO_DATE = "2027-02-13";

const content: WeddingWebsiteContent = {
  hero: {
    names: "Dom & Jordyn",
    date: DEMO_DATE,
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

/** LAND-01a checkpoint harness — delete after Dom verifies. */
export default function DateCheckPage() {
  const expected = formatWeddingDate(DEMO_DATE);

  return (
    <div className="min-h-full bg-canvas text-ink">
      <header className="border-b border-hairline px-6 py-4">
        <p className="text-[13px] text-muted">
          LAND-01a date check · shared helper →{" "}
          <span className="font-semibold text-ink tabular-nums">{expected}</span>
        </p>
      </header>
      <div className="space-y-10 px-4 py-8">
        {weddingTemplateOptions().map((t) => (
          <section
            key={t.key}
            id={`tpl-${t.key}`}
            className="overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-raised"
          >
            <div className="border-b border-hairline px-4 py-2 text-[12px] font-semibold tracking-[0.08em] text-muted uppercase">
              {t.label} ({t.key})
            </div>
            <div className="max-h-[480px] overflow-auto">
              <WeddingSiteView
                content={content}
                template={t.key}
                theme={t.suggestedTheme ?? "ivory"}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
