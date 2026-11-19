import { JsonLd } from "@/components/marketing/json-ld";
import { ToolPage } from "@/components/plan/tool-page";
import { VenueQuiz } from "@/components/plan/venue-quiz";
import { DIRECTORY_STATES } from "@/lib/directory/states";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = pageMetadata({
  title: "Wedding Venue Quiz",
  description:
    "Take the free wedding venue quiz: answer three questions and see real wedding venues in your state that match your style. No sign-up needed.",
  path: "/plan/venue-quiz",
});

export default function VenueQuizPage() {
  return (
    <ToolPage
      eyebrow="Venue match quiz"
      title="Find your wedding venue style"
      intro="Three quick questions, then a shortlist of real venues in your state. No sign-up, and no venue paid to show up here."
      source="tool:venue-quiz"
      appPitch="Save venues to your plan, email them from your own inbox, and track every reply in one place."
      currentHref="/plan/venue-quiz"
    >
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Planning tools", path: "/plan" },
          { name: "Venue quiz", path: "/plan/venue-quiz" },
        ])}
      />
      <VenueQuiz states={DIRECTORY_STATES} />
    </ToolPage>
  );
}
