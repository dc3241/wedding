import {
  resolveSectionOrder,
  travelHasContent,
  type WebsiteSectionId,
  type WeddingWebsiteContent,
} from "../types";

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

const ANCHOR_LABEL: Record<WebsiteSectionId, string> = {
  story: "Our story",
  details: "Details",
  schedule: "Schedule",
  gallery: "Gallery",
  party: "Party",
  travel: "Travel",
  faq: "FAQ",
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

function sectionIsShown(
  id: WebsiteSectionId,
  content: WeddingWebsiteContent,
): boolean {
  switch (id) {
    case "story":
      return showStory(content);
    case "details":
      return showDetails(content);
    case "schedule":
      return showSchedule(content);
    case "gallery":
      return showGallery(content);
    case "party":
      return showParty(content);
    case "travel":
      return showTravel(content);
    case "faq":
      return showFaq(content);
  }
}

/** In-page anchors for SiteNav — only sections that will actually render. */
export function buildSectionAnchors(
  content: WeddingWebsiteContent,
): SectionAnchor[] {
  return resolveSectionOrder(content)
    .filter((id) => sectionIsShown(id, content))
    .map((id) => ({ id, label: ANCHOR_LABEL[id] }));
}
