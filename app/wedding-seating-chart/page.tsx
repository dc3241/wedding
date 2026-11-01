import { IntentPage } from "@/components/marketing/intent-page";
import { COUPLE_LANDING_PATH } from "@/lib/marketing-flags";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

const PATH = "/wedding-seating-chart";
const DESCRIPTION =
  "Build a wedding seating chart from the same guest list that collects RSVPs. Sweetheart and head tables, dance floor, and a per-table breakdown — without a separate seating app.";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Seating Chart",
  description: DESCRIPTION,
  path: PATH,
});

export default function WeddingSeatingChartRoute() {
  return (
    <IntentPage
      path={PATH}
      breadcrumbName="Seating chart"
      eyebrow="Seating"
      h1="A wedding seating chart tied to the real guest list"
      lede="If RSVPs live in one tool and chairs in another, the chart is already wrong. First Look builds the floor plan from the same households and meals you already track."
      demoKind="personal"
      ctaLabel="Start planning — free"
      appDescription="First Look is a wedding seating chart tied to your guest list: sweetheart and head tables, dance floor layout, and a per-table guest breakdown."
      sections={[
        {
          eyebrow: "One roster",
          title: "Guests RSVP. Seats update with them.",
          body: "Declines should free a chair. Meal counts should match who is actually sitting down. The chart is a view of the guest list, not a second spreadsheet.",
        },
        {
          eyebrow: "The floor",
          title: "Tables by form, not by a status color.",
          body: "Sweetheart and head tables read as what they are. A full table is settled; the table you have selected is the one you are editing. Kind of table is never a color code.",
          bullets: [
            "Visual seating chart on the canvas.",
            "Sweetheart and head tables, labeled as such.",
            "Dance floor in the layout, not a sticky note.",
            "Per-table guest breakdown for the printer and the captain.",
          ],
        },
        {
          eyebrow: "Day of",
          title: "Print what the room will actually see.",
          body: "The chart and the guest list should agree when you hand a sheet to the venue. No exporting to a third seating product the night before.",
        },
      ]}
      faqs={[
        {
          q: "Is there a free wedding seating chart tool?",
          a: "You can start free in First Look. The seating chart uses the same guest list and RSVPs as the rest of the wedding — no separate seating login.",
        },
        {
          q: "Does seating include meal counts?",
          a: "Meals live on the guest list. The chart places people who are actually attending, so catering and the floor plan share a headcount.",
        },
        {
          q: "Can I print the seating chart?",
          a: "Yes. There is a print view for the chart, and a per-table breakdown for staff.",
        },
        {
          q: "What if my planner runs the chart?",
          a: "If they invited you in, you share the same wedding. They see the chart in their book; you are not emailing a PDF of round tables.",
        },
      ]}
      related={[
        { href: COUPLE_LANDING_PATH, label: "Wedding planning app" },
        { href: "/wedding-guest-list", label: "Guest list and RSVPs" },
        {
          href: "/wedding-planning-checklist",
          label: "Wedding planning checklist",
        },
        { href: "/wedding-budget-tracking", label: "Budget tracking" },
      ]}
    />
  );
}
