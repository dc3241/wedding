import type { ReactNode } from "react";
import {
  resolveSectionOrder,
  type WebsiteSectionId,
  type WeddingWebsiteContent,
} from "../types";
import { DetailsSection } from "./DetailsSection";
import { FaqSection } from "./FaqSection";
import { GallerySection } from "./GallerySection";
import { MonogramMark } from "./MonogramMark";
import { ScheduleSection } from "./ScheduleSection";
import {
  showDetails,
  showFaq,
  showGallery,
  showParty,
  showSchedule,
  showStory,
  showTravel,
  type SectionVariant,
} from "./section-meta";
import { StorySection } from "./StorySection";
import { TravelSection } from "./TravelSection";
import { WeddingPartySection } from "./WeddingPartySection";

type SeparatorKind = "monogram" | "none";

/** Shared body stack — order from content.sectionOrder; tint bands alternate. */
export function SectionStack({
  content,
  variant,
  separator = "monogram",
}: {
  content: WeddingWebsiteContent;
  variant: SectionVariant;
  separator?: SeparatorKind;
}) {
  type Block = {
    key: WebsiteSectionId;
    show: boolean;
    node: (tint: boolean) => ReactNode;
  };

  const byId: Record<WebsiteSectionId, Block> = {
    story: {
      key: "story",
      show: showStory(content),
      node: (tint) => (
        <StorySection content={content} variant={variant} tint={tint} />
      ),
    },
    details: {
      key: "details",
      show: showDetails(content),
      node: (tint) => (
        <DetailsSection content={content} variant={variant} tint={tint} />
      ),
    },
    schedule: {
      key: "schedule",
      show: showSchedule(content),
      node: (tint) => (
        <ScheduleSection content={content} variant={variant} tint={tint} />
      ),
    },
    gallery: {
      key: "gallery",
      show: showGallery(content),
      node: (tint) => (
        <GallerySection content={content} variant={variant} tint={tint} />
      ),
    },
    party: {
      key: "party",
      show: showParty(content),
      node: (tint) => (
        <WeddingPartySection content={content} variant={variant} tint={tint} />
      ),
    },
    travel: {
      key: "travel",
      show: showTravel(content),
      node: (tint) => (
        <TravelSection content={content} variant={variant} tint={tint} />
      ),
    },
    faq: {
      key: "faq",
      show: showFaq(content),
      node: (tint) => (
        <FaqSection content={content} variant={variant} tint={tint} />
      ),
    },
  };

  const visible = resolveSectionOrder(content)
    .map((id) => byId[id])
    .filter((block) => block.show);

  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((block, index) => (
        <div key={block.key}>
          {index > 0 && separator === "monogram" ? (
            <MonogramMark names={content.hero.names} variant={variant} />
          ) : null}
          {block.node(index % 2 === 1)}
        </div>
      ))}
    </>
  );
}
