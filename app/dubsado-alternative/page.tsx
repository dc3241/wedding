import { AlternativePage } from "@/components/marketing/alternative-page";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Dubsado Alternative for Wedding Planners",
  description:
    "Looking for a Dubsado alternative built for weddings? First Look is a wedding planning CRM: lead, payment, and the couple's workbook in one platform.",
  path: "/dubsado-alternative",
});

export default function DubsadoAlternativeRoute() {
  return (
    <AlternativePage
      competitor="Dubsado"
      path="/dubsado-alternative"
      eyebrow="Dubsado alternative"
      h1="A Dubsado alternative that runs the wedding, not just the workflow."
      lede="Dubsado is a strong workflow CRM for service businesses. Wedding planners still have to run the day: guests, seating, budget, a site. First Look is the wedding planning CRM that continues into the workbook."
      rows={[
        {
          label: "Lead pipeline",
          them: "Jobs, forms, and custom workflows",
          us: "Inquiry → contacted → proposal → booked, with stale leads flagged",
        },
        {
          label: "Contracts and invoices",
          them: "Forms, contracts, invoices, and scheduled payments",
          us: "Proposal becomes a signed contract and an invoice, in the same wedding",
        },
        {
          label: "Client portal",
          them: "A portal for forms, files, and invoices",
          us: "The couple's actual workspace: checklist, guests, seating, budget, site",
        },
        {
          label: "Wedding website & RSVP",
          them: "Not a wedding-site builder",
          us: "Photo-led site with meal-aware RSVP that feeds the guest list",
        },
        {
          label: "Who it's for",
          them: "Service businesses that need custom workflows",
          us: "Wedding planners and venues — wedding-specific, end to end",
        },
      ]}
      whoItsFor="You like Dubsado's workflows, but after the contract you still live in a planning spreadsheet, a seating tool, and a separate website builder. First Look keeps the CRM and hands the couple a real wedding workspace."
      whoStays="You run a mixed-service business and need highly custom workflows across many job types. Dubsado is built for that. First Look is for weddings."
      faqs={[
        {
          q: "Is First Look a Dubsado alternative?",
          a: "For wedding planners and venues, yes — if what you need after the booking is the wedding itself. First Look covers leads, proposals, contracts, and invoices, then continues into the couple's workbook.",
        },
        {
          q: "Does First Look have custom workflows like Dubsado?",
          a: "First Look ships a wedding-specific pipeline and automations, not a general workflow builder. The tradeoff is that the booked job is already a wedding with guests, seating, budget, and a site.",
        },
        {
          q: "Can I invite the couple into the same project?",
          a: "Yes. After they book, invite them into the wedding. They plan inside your book instead of logging into a separate portal that is not a planning workspace.",
        },
        {
          q: "Does First Look white-label the client experience?",
          a: "Yes. Clients can see your brand on their workspace and site. Venue accounts can extend that branding across the whole team's dashboard.",
        },
      ]}
    />
  );
}
