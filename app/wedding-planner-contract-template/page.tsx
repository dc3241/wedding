import { IntentPage } from "@/components/marketing/intent-page";
import { howToJsonLd, pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

const PATH = "/wedding-planner-contract-template";
const DESCRIPTION =
  "What belongs in a wedding planner contract, and how First Look turns an accepted proposal into a signed, printable contract — then an invoice — without leaving the wedding.";

const STEPS = [
  {
    name: "Scope the job in the proposal",
    text: "Date, couple, services, and fee live on the proposal so you are not rebuilding a Word doc after the tour.",
  },
  {
    name: "Spell out payment, cancellation, and the wedding date",
    text: "A usable contract states when money is due, what happens if either party cancels, and which date you are holding.",
  },
  {
    name: "Send it for acceptance",
    text: "The couple reviews the proposal in the browser. Accepting it is the handoff from sales to a booked wedding.",
  },
  {
    name: "File the printable contract",
    text: "In First Look, an accepted proposal becomes a signed, printable contract on that same lead — not a separate DocuSign folder.",
  },
  {
    name: "Invoice from the same wedding",
    text: "The contract is not the end. Send the invoice from the booked wedding so payment sits next to the plan.",
  },
] as const;

export const metadata: Metadata = pageMetadata({
  title: "Wedding Planner Contract Template",
  description: DESCRIPTION,
  path: PATH,
});

export default function WeddingPlannerContractTemplateRoute() {
  return (
    <IntentPage
      path={PATH}
      breadcrumbName="Contract template"
      eyebrow="Contracts"
      h1="A wedding planner contract that does not live in a separate folder"
      lede="You still need the clauses. You should not need Word, DocuSign, and a Drive folder to get them signed. First Look turns an accepted proposal into a printable contract, then an invoice, in the same wedding."
      demoKind="business"
      appDescription="First Look turns an accepted wedding proposal into a signed, printable contract and invoice in the same wedding."
      extraJsonLd={howToJsonLd({
        name: "Turn a wedding proposal into a signed contract",
        description: DESCRIPTION,
        steps: STEPS,
      })}
      sections={[
        {
          eyebrow: "What to include",
          title: "The clauses every planner contract needs.",
          body: "Templates vary by state and by how you work. These are the pieces couples and planners actually fight over later — get them in writing before the date is held.",
          bullets: [
            "Parties and the wedding date (and what happens if the date moves).",
            "Scope of services — what you will and will not do on the day.",
            "Fee, retainer, and a payment schedule.",
            "Cancellation, postponement, and refund terms.",
            "Force majeure and what happens if the venue fails.",
            "Who owns photos, plans, and files after the wedding.",
          ],
          note: "This is a planning overview, not legal advice. Have an attorney licensed in your state review the agreement you send.",
        },
        {
          eyebrow: "In First Look",
          title: "Proposal, contract, invoice — one record.",
          body: "Blank-document contracts go stale the night after the tour. Keep packages in the app, send the proposal while the visit is fresh, and let acceptance file the contract.",
          steps: STEPS,
        },
      ]}
      faqs={[
        {
          q: "Does First Look include a wedding planner contract template?",
          a: "First Look turns your proposal into a signed, printable contract when the couple accepts. You still set the terms — scope, payment, cancellation — rather than downloading a generic Word file.",
        },
        {
          q: "Is this legal advice?",
          a: "No. Contract law is state-specific. Use the checklist above as a prompt, then have a lawyer review what you send.",
        },
        {
          q: "What happens after they sign?",
          a: "The lead is booked. You can send an invoice and invite the couple into the wedding workbook — checklist, guests, seating, budget, and a site.",
        },
        {
          q: "Can I still store vendor contracts?",
          a: "Yes. Each wedding has a contracts area for signed agreements, proposals, and vendor contracts you upload.",
        },
      ]}
      related={[
        { href: "/for-planners", label: "Wedding planner CRM" },
        {
          href: "/wedding-inquiry-pipeline",
          label: "Run the inquiry pipeline",
        },
        { href: "/wedding-planner-crm", label: "What to look for in a CRM" },
      ]}
      finalTitle="Stop rebuilding the contract from memory."
      finalSubhead="Send the proposal from the lead. Acceptance files the contract. Free to start."
    />
  );
}
