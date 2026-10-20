import { AlternativePage } from "@/components/marketing/alternative-page";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "HoneyBook Alternative for Wedding Planners",
  description:
    "Looking for a HoneyBook alternative built for weddings? First Look is a wedding planning CRM: lead, payment, and the couple's workbook in one platform.",
  path: "/honeybook-alternative",
});

export default function HoneybookAlternativeRoute() {
  return (
    <AlternativePage
      competitor="HoneyBook"
      path="/honeybook-alternative"
      eyebrow="HoneyBook alternative"
      h1="A HoneyBook alternative built for the wedding, not just the booking."
      lede="HoneyBook is a strong CRM for creatives. Wedding planners still have to run the day: guests, seating, budget, a site. First Look is the wedding planning CRM that continues into the workbook."
      rows={[
        {
          label: "Lead pipeline",
          them: "Inquiries, follow-ups, and a client flow",
          us: "Inquiry → contacted → proposal → booked, with stale leads flagged",
        },
        {
          label: "Proposals, contracts, invoices",
          them: "Built for getting the job booked and paid",
          us: "Proposal becomes a signed contract and an invoice, in the same wedding",
        },
        {
          label: "Client portal",
          them: "A portal for files, invoices, and project updates",
          us: "The couple's actual workspace: checklist, guests, seating, budget, site",
        },
        {
          label: "Wedding website & RSVP",
          them: "Not a wedding-site builder",
          us: "Photo-led site with meal-aware RSVP that feeds the guest list",
        },
        {
          label: "Who it's for",
          them: "Photographers, designers, and other service businesses",
          us: "Wedding planners and venues — wedding-specific, end to end",
        },
      ]}
      whoItsFor="You like HoneyBook's pipeline, but after the contract you still live in spreadsheets, a seating tool, and a separate website builder. First Look keeps the CRM and hands the couple a real wedding workspace."
      whoStays="You run a photography, design, or mixed-service business and want a general client CRM. HoneyBook is built for that broader set of work. First Look is for weddings."
      faqs={[
        {
          q: "Is First Look a HoneyBook alternative?",
          a: "For wedding planners and venues, yes — if what you need after the booking is the wedding itself. First Look covers leads, proposals, contracts, and invoices, then continues into the couple's workbook.",
        },
        {
          q: "Will I lose the CRM features I use in HoneyBook?",
          a: "You still get an inquiry board, proposals, contracts, and invoices. What you gain is the planning layer HoneyBook is not built to be: checklist, guests, seating, budget, and a wedding website.",
        },
        {
          q: "Can couples use First Look if I stay on HoneyBook?",
          a: "Couples can sign up on their own. The point of First Look as a CRM is that the couple you book is already inside the same wedding — no handoff to a second product.",
        },
        {
          q: "Does First Look white-label the client experience?",
          a: "Yes. Clients can see your brand on their workspace and site. Venue accounts can extend that branding across the whole team's dashboard.",
        },
      ]}
    />
  );
}
