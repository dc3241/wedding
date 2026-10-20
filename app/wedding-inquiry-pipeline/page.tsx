import { IntentPage } from "@/components/marketing/intent-page";
import { howToJsonLd, pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

const PATH = "/wedding-inquiry-pipeline";
const DESCRIPTION =
  "How to run a wedding inquiry pipeline: inquiry, contacted, proposal, booked. First Look puts every lead on a board, flags stale ones at two weeks, and turns acceptance into a contract and invoice.";

const STEPS = [
  {
    name: "Catch every inquiry in one place",
    text: "Share a public inquiry page or embed the form on your site. Email threads are not a pipeline.",
  },
  {
    name: "Move it to Contacted the same day you reply",
    text: "A drafted reply is waiting for you to approve. Stage the lead when you actually send it, so the board matches reality.",
  },
  {
    name: "Send the proposal while the tour is fresh",
    text: "Packages live in the app. The proposal goes out from the lead, not from a blank document the next morning.",
  },
  {
    name: "Book, contract, and invoice from acceptance",
    text: "When they accept, the lead is booked. The printable contract and invoice belong on that same wedding.",
  },
  {
    name: "Invite the couple into the workbook",
    text: "The pipeline is not finished at payment. They plan guests, seating, and the site inside your book.",
  },
  {
    name: "Flag anything untouched for two weeks",
    text: "First Look marks stale leads automatically so quiet inquiries do not go cold in the backlog.",
  },
] as const;

export const metadata: Metadata = pageMetadata({
  title: "Wedding Inquiry Pipeline",
  description: DESCRIPTION,
  path: PATH,
});

export default function WeddingInquiryPipelineRoute() {
  return (
    <IntentPage
      path={PATH}
      breadcrumbName="Inquiry pipeline"
      eyebrow="Lead pipeline"
      h1="How to run a wedding inquiry pipeline"
      lede="Inquiry, contacted, proposal, booked — plus lost, when it is honest. If inquiries still live in email, you do not have a pipeline. You have a hope that you will remember to follow up."
      demoKind="business"
      appDescription="First Look is a wedding inquiry pipeline: inquiry to contacted to proposal to booked, with stale leads flagged and acceptance turning into a contract and invoice."
      extraJsonLd={howToJsonLd({
        name: "How to run a wedding inquiry pipeline",
        description: DESCRIPTION,
        steps: STEPS,
      })}
      sections={[
        {
          eyebrow: "Stages",
          title: "Five stages. One board.",
          body: "Keep the language boring on purpose. Fancy custom workflows hide the fact that a lead is sitting still.",
          bullets: [
            "Inquiry — they submitted the form or wrote in. Nothing has gone out yet.",
            "Contacted — you replied. The clock on follow-up starts here.",
            "Proposal — a package is in their hands.",
            "Booked — they accepted. Contract and invoice belong on this wedding.",
            "Lost — you closed it, with a reason, so it leaves the active board.",
          ],
        },
        {
          eyebrow: "The runbook",
          title: "From first inquiry to the wedding itself.",
          body: "Treat the board as the source of truth. If a step happened outside the app, move the card anyway.",
          steps: STEPS,
        },
      ]}
      faqs={[
        {
          q: "What is a wedding inquiry pipeline?",
          a: "A shared set of stages every lead moves through — typically inquiry, contacted, proposal, booked, and lost — so nothing lives only in someone's inbox.",
        },
        {
          q: "How does First Look capture inquiries?",
          a: "Each planner or venue gets a public inquiry page you can share or embed. Submissions land on the board as inquiry leads, with a reply draft to approve.",
        },
        {
          q: "When is a lead considered stale?",
          a: "Leads untouched for two weeks are flagged automatically so you can follow up or mark them lost.",
        },
        {
          q: "What happens after booked?",
          a: "You file the contract, send the invoice, and invite the couple into the wedding workbook. The CRM continues into the plan.",
        },
      ]}
      related={[
        { href: "/for-planners", label: "Wedding planner CRM" },
        {
          href: "/wedding-planner-contract-template",
          label: "Proposal to contract",
        },
        { href: "/wedding-planner-crm", label: "What to look for in a CRM" },
      ]}
      finalTitle="Get inquiries off email."
      finalSubhead="A public form, a board, and stale leads flagged at two weeks. Free to start."
    />
  );
}
