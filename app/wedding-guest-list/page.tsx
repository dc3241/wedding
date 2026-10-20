import { IntentPage } from "@/components/marketing/intent-page";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

const PATH = "/wedding-guest-list";
const DESCRIPTION =
  "Build a wedding guest list with households, RSVPs, meal choices, and a live headcount. Guests reply on your wedding website; the list updates in the same workspace.";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Guest List & RSVP",
  description: DESCRIPTION,
  path: PATH,
});

export default function WeddingGuestListRoute() {
  return (
    <IntentPage
      path={PATH}
      breadcrumbName="Guest list"
      eyebrow="Guests"
      h1="A wedding guest list that matches who is actually coming"
      lede="Spreadsheets lie the week the plus-ones land. First Look keeps households, RSVPs, meals, and dietary notes in one list — fed by the same website your guests already use."
      demoKind="personal"
      ctaLabel="Start planning — free"
      appDescription="First Look is a wedding guest list with households, online RSVP, meal choices, and a live attending headcount in the same workspace as your seating chart."
      sections={[
        {
          eyebrow: "The list",
          title: "Households, not a flat column of names.",
          body: "Guests arrive in groups. Track the household, then each person — so a plus-one, a child's meal, and a declined seat do not scramble the count.",
        },
        {
          eyebrow: "RSVP",
          title: "They reply on your site. The list updates.",
          body: "No separate RSVP tool. Meal-aware replies, optional song requests, and dietary notes land on the guest list you already keep — not in an email you have to retype.",
          bullets: [
            "Online RSVP from the wedding website.",
            "Meal choices and courses per attendee.",
            "Dietary notes next to the name, not in a side tab.",
            "A live attending headcount for catering and seating.",
          ],
        },
        {
          eyebrow: "Seating",
          title: "The chart reads the same list.",
          body: "When someone RSVPs no, they should not still occupy a chair in a different app. Guest list and seating chart share the roster.",
        },
      ]}
      faqs={[
        {
          q: "Can guests RSVP online?",
          a: "Yes. RSVP lives on your First Look wedding website. Replies update the guest list — including meals — without a second tool.",
        },
        {
          q: "Do I have to collect email for every guest?",
          a: "No. Email is optional on RSVP. The household lookup is how guests find themselves, not a requirement that everyone has an inbox on file.",
        },
        {
          q: "Does the guest list include a registry?",
          a: "The registry lives on the wedding site, next to RSVP. Claims stay in the same place guests already are.",
        },
        {
          q: "Can my planner see the same list?",
          a: "If they invited you into the wedding, yes. Headcount, meals, and seating stay in their book automatically.",
        },
      ]}
      related={[
        { href: "/for-couples", label: "Couple workspace" },
        { href: "/wedding-seating-chart", label: "Seating chart" },
        {
          href: "/wedding-planning-checklist",
          label: "Wedding planning checklist",
        },
        { href: "/wedding-budget-tracking", label: "Budget tracking" },
      ]}
    />
  );
}
