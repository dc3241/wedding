import type { WeddingWebsiteContent } from "../types";
import { Band, Wrap } from "../layout";
import { SectionHead } from "./SectionHead";
import { showStory, type SectionVariant } from "./section-meta";

type StorySectionProps = {
  content: WeddingWebsiteContent;
  variant: SectionVariant;
  tint?: boolean;
};

export function StorySection({ content, variant, tint }: StorySectionProps) {
  if (!showStory(content)) return null;

  const { story } = content;
  const leftAlign = variant === "editorial" || variant === "minimalist";

  return (
    <Band id="story" tint={tint}>
      <Wrap>
        <div className={leftAlign ? "max-w-3xl" : "mx-auto max-w-3xl text-center"}>
          <SectionHead
            variant={variant}
            eyebrow={variant === "minimalist" ? undefined : "Our story"}
          >
            {story.heading || "Our Story"}
          </SectionHead>
          {story.body ? (
            <p
              className="m-0 whitespace-pre-line text-[17px] leading-relaxed"
              style={{
                color: "var(--ws-ink)",
                opacity: 0.85,
              }}
            >
              {story.body}
            </p>
          ) : null}
        </div>
      </Wrap>
    </Band>
  );
}
