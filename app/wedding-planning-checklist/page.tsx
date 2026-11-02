import { IntentPage } from "@/components/marketing/intent-page";
import { COUPLE_LANDING_PATH } from "@/lib/marketing-flags";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

const PATH = "/wedding-planning-checklist";
const DESCRIPTION =
  "A wedding planning checklist built around your date and budget — not a generic printout. First Look gives you phases, due dates, and a plan you can edit from day one.";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Planning Checklist",
  description: DESCRIPTION,
  path: PATH,
});

export default function WeddingPlanningChecklistRoute() {
  return (
    <IntentPage
      path={PATH}
      breadcrumbName="Planning checklist"
      eyebrow="The plan"
      h1="A wedding planning checklist that actually moves"
      lede="Generic checklists assume every wedding is the same Saturday in June. First Look builds a plan from your date and budget, then keeps phases and due dates in one progress band — yours to edit."
      demoKind="personal"
      ctaLabel="Start planning — free"
      appDescription="First Look is a wedding planning checklist built around your date and budget, with phases, due dates, and a workspace you can edit from day one."
      sections={[
        {
          eyebrow: "Day one",
          title: "Answer a few questions. Get a real plan.",
          body: "Date, budget, and what you already know about the day are enough to generate a starter checklist and vendor shortlist. You are not copying someone else's 18-month timeline into a note.",
        },
        {
          eyebrow: "How it stays current",
          title: "Phases and due dates, not a static PDF.",
          body: "The checklist lives next to budget, vendors, and guests. Mark a florist delivery done, add a hair trial, or ask the assistant in plain language — the plan updates in the same wedding.",
          bullets: [
            "A progress band so you can see what is done without opening every task.",
            "Smart phases that follow the wedding, not a generic month-by-month blog post.",
            "Due dates you can change when the venue actually books.",
            "A printable day-of run sheet when the plan is ready for vendors.",
          ],
        },
        {
          eyebrow: "With a planner",
          title: "Same checklist, one wedding.",
          body: "If a planner or venue invited you in, this is their book too. You work the tasks; they keep the pipeline, contracts, and invoices. Nobody is emailing a spreadsheet back and forth.",
        },
      ]}
      faqs={[
        {
          q: "Is there a free wedding planning checklist?",
          a: "Yes. Start free in First Look with no card required. You get a checklist built around your date and budget, not a one-size printout.",
        },
        {
          q: "Can I edit the generated plan?",
          a: "Always. The starter plan is a draft. Add, remove, and retitle tasks as the wedding gets specific.",
        },
        {
          q: "Does the checklist include vendors and budget?",
          a: "The checklist sits next to vendor outreach and planned-vs-actual spend in the same workspace, so the plan and the money stay attached.",
        },
        {
          q: "What if I already have a planner?",
          a: "They can invite you into the wedding they already run. You get the checklist; they keep the CRM side.",
        },
      ]}
      related={[
        { href: COUPLE_LANDING_PATH, label: "Wedding planning app" },
        { href: "/wedding-budget-tracking", label: "Wedding budget tracking" },
        { href: "/wedding-guest-list", label: "Guest list and RSVPs" },
        { href: "/wedding-seating-chart", label: "Seating chart" },
      ]}
    />
  );
}
