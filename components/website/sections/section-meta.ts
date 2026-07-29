import { travelHasContent, type WeddingWebsiteContent } from "../types";

export type SectionVariant =
  | "classic"
  | "editorial"
  | "romance"
  | "minimalist"
  | "garden";

export type SectionAnchor = {
  id: string;
  label: string;
};

export function showStory(content: WeddingWebsiteContent): boolean {
  return content.story.visible;
}

export function showDetails(content: WeddingWebsiteContent): boolean {
  return content.details.visible;
}

export function showSchedule(content: WeddingWebsiteContent): boolean {
  return content.schedule.visible && content.schedule.items.length > 0;
}

export function showTravel(content: WeddingWebsiteContent): boolean {
  return content.travel.visible && travelHasContent(content.travel);
}

/** visible + ≥1 image — empty gallery must render nothing. */
export function showGallery(content: WeddingWebsiteContent): boolean {
  return content.gallery.visible && content.gallery.images.length > 0;
}

/** visible + ≥1 member with a name. */
export function showParty(content: WeddingWebsiteContent): boolean {
  return (
    content.party.visible &&
    content.party.members.some((member) => member.name.trim().length > 0)
  );
}

/** visible + ≥1 complete FAQ item. */
export function showFaq(content: WeddingWebsiteContent): boolean {
  return (
    content.faq.visible &&
    content.faq.items.some(
      (item) => item.question.trim().length > 0 && item.answer.trim().length > 0,
    )
  );
}

/** In-page anchors for SiteNav — only sections that will actually render. */
export function buildSectionAnchors(
  content: WeddingWebsiteContent,
): SectionAnchor[] {
  const anchors: SectionAnchor[] = [];
  if (showStory(content)) anchors.push({ id: "story", label: "Our story" });
  if (showDetails(content)) anchors.push({ id: "details", label: "Details" });
  if (showSchedule(content)) anchors.push({ id: "schedule", label: "Schedule" });
  if (showGallery(content)) anchors.push({ id: "gallery", label: "Gallery" });
  if (showParty(content)) anchors.push({ id: "party", label: "Party" });
  if (showTravel(content)) anchors.push({ id: "travel", label: "Travel" });
  if (showFaq(content)) anchors.push({ id: "faq", label: "FAQ" });
  return anchors;
}
