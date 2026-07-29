import type { ReactNode } from "react";
import type { WeddingWebsiteContent } from "../types";
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

/** Shared body stack — mockup order; tint bands alternate. */
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
    key: string;
    show: boolean;
    node: (tint: boolean) => ReactNode;
  };

  const blocks: Block[] = [
    {
      key: "story",
      show: showStory(content),
      node: (tint) => (
        <StorySection content={content} variant={variant} tint={tint} />
      ),
    },
    {
      key: "details",
      show: showDetails(content),
      node: (tint) => (
        <DetailsSection content={content} variant={variant} tint={tint} />
      ),
    },
    {
      key: "schedule",
      show: showSchedule(content),
      node: (tint) => (
        <ScheduleSection content={content} variant={variant} tint={tint} />
      ),
    },
    {
      key: "gallery",
      show: showGallery(content),
      node: (tint) => (
        <GallerySection content={content} variant={variant} tint={tint} />
      ),
    },
    {
      key: "party",
      show: showParty(content),
      node: (tint) => (
        <WeddingPartySection content={content} variant={variant} tint={tint} />
      ),
    },
    {
      key: "travel",
      show: showTravel(content),
      node: (tint) => (
        <TravelSection content={content} variant={variant} tint={tint} />
      ),
    },
    {
      key: "faq",
      show: showFaq(content),
      node: (tint) => (
        <FaqSection content={content} variant={variant} tint={tint} />
      ),
    },
  ];

  const visible = blocks.filter((block) => block.show);
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
