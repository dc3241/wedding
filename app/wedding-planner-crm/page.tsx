import { IntentPage } from "@/components/marketing/intent-page";
import { articleJsonLd, pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

const PATH = "/wedding-planner-crm";
const DESCRIPTION =
  "What to look for in a wedding planner CRM: pipeline, contracts, invoices, and the couple's workbook. A buying guide for planners comparing HoneyBook, Dubsado, and First Look.";

export const metadata: Metadata = pageMetadata({
  title: "Best Wedding Planner CRM",
  description: DESCRIPTION,
  path: PATH,
});

export default function WeddingPlannerCrmRoute() {
  return (
    <IntentPage
      path={PATH}
      breadcrumbName="Wedding planner CRM"
      eyebrow="Buying guide"
      h1="What to look for in a wedding planner CRM"
      lede="Most CRMs book the job and stop. A wedding planner CRM has to run the wedding too — guests, seating, budget, a site — or you are back in five other tools the week after they sign."
      demoKind="business"
      appDescription="First Look is a wedding planner CRM that goes from lead to payment to the couple's workbook in one platform."
      extraJsonLd={articleJsonLd({
        headline: "What to look for in a wedding planner CRM",
        description: DESCRIPTION,
        path: PATH,
      })}
      sections={[
        {
          eyebrow: "The job",
          title: "A CRM for weddings is not a generic client CRM.",
          body: "HoneyBook and Dubsado are strong at inquiries, contracts, and getting paid. Wedding planners still have to plan the day. Judge software on whether the booked job is already a wedding — not a folder you export into spreadsheets.",
        },
        {
          eyebrow: "Criteria",
          title: "Five things a wedding planner CRM has to do.",
          body: "Use this list when you compare tools. If a product only covers the first two, you still need a planning stack.",
          bullets: [
            "A lead pipeline: inquiry → contacted → proposal → booked, with stale leads flagged.",
            "Proposals that become signed contracts and invoices, in the same record.",
            "A couple workspace after they book — checklist, guests, seating, budget, website.",
            "A way to invite the couple in, instead of handing them five other apps.",
            "Your brand on what clients see. Venues should be able to white-label the whole team dashboard.",
          ],
        },
        {
          eyebrow: "Where others stop",
          title: "Client flow is not the wedding.",
          body: "A portal for files and invoices is useful. It is not a guest list, a seating chart, or a meal-aware RSVP site. If you still live in a spreadsheet after the contract, the CRM ended at your desk.",
        },
        {
          eyebrow: "First Look",
          title: "Lead to payment to the workbook.",
          body: "First Look is built for that full chain. Capture the inquiry, send the proposal, collect payment, then invite the couple into the same wedding. Planners and venues share the pipeline; venues add white-label.",
        },
      ]}
      faqs={[
        {
          q: "What is the best wedding planner CRM?",
          a: "The best fit is the one that covers booking and the wedding. If you only need invoices and contracts for mixed creative work, a general CRM may be enough. If you plan weddings, look for a pipeline that continues into the couple's workbook.",
        },
        {
          q: "How is a wedding planner CRM different from HoneyBook or Dubsado?",
          a: "Those tools are client-flow CRMs for many service businesses. First Look is wedding-specific: the same lead-to-payment path, then guests, seating, budget, and a site in one platform.",
        },
        {
          q: "Do I still need a separate planning app?",
          a: "Not if the CRM includes the workbook. First Look is built so you do not hand the couple a second product after they book.",
        },
        {
          q: "Is First Look only for planners?",
          a: "Planners and venues share the same CRM. Couples can also plan on their own, or get invited into a wedding you already run.",
        },
      ]}
      related={[
        { href: "/for-planners", label: "Wedding planner CRM product" },
        { href: "/honeybook-alternative", label: "HoneyBook alternative" },
        { href: "/dubsado-alternative", label: "Dubsado alternative" },
        { href: "/wedding-inquiry-pipeline", label: "Run an inquiry pipeline" },
      ]}
    />
  );
}
