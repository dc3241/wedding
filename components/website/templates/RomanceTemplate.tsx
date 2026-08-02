"use client";

import type { WeddingTemplateProps } from "../template-props";
import { HeroPhotoBackdrop } from "../HeroPhotoBackdrop";
import { OverlayNav } from "../OverlayNav";
import { resolveWeddingTheme } from "../themes";
import { formatWeddingDate, splitCoupleNames } from "../template-utils";
import { WeddingCountdown } from "../WeddingCountdown";
import { buildSectionAnchors, SectionStack } from "../sections";
import { SITE_GUTTER } from "../layout";

function RomanceNames({ names }: { names: string }) {
  const parsed = splitCoupleNames(names);
  if (parsed.kind === "pair") {
    return (
      <h1 className="font-serif-display m-0 text-[clamp(52px,11vw,120px)] leading-[0.98] font-medium">
        {parsed.first}
        <span
          className="font-script mx-[0.12em] text-[1.15em] not-italic"
          style={{ color: "#f2dcd8", verticalAlign: "-0.08em" }}
        >
          &amp;
        </span>
        {parsed.second}
      </h1>
    );
  }
  return (
    <h1 className="font-serif-display m-0 text-[clamp(52px,11vw,120px)] leading-[0.98] font-medium">
      {parsed.text}
    </h1>
  );
}

export function RomanceTemplate({
  content,
  theme,
  homeHref,
  pageSlot,
}: WeddingTemplateProps) {
  const palette = resolveWeddingTheme(theme);
  const { hero } = content;
  const displayDate = hero.date ? formatWeddingDate(hero.date) : null;
  const sectionAnchors = pageSlot ? [] : buildSectionAnchors(content);
  const showRsvp = !pageSlot && content.rsvp.visible;

  return (
    <div
      className="min-h-full font-ws-sans text-[17px] leading-relaxed"
      style={{
        ...palette.cssVars,
        background: "var(--ws-bg)",
        color: "var(--ws-ink)",
      }}
    >
      <header className="relative grid min-h-[80vh] place-items-center overflow-hidden text-center text-white">
        <HeroPhotoBackdrop imageUrl={hero.imageUrl} fallbackTone="romance" />
        <OverlayNav
          names={hero.names}
          anchors={sectionAnchors}
          homeHref={homeHref}
          showRsvp={showRsvp}
        />
        <div
          className="relative z-10"
          style={{ padding: `120px ${SITE_GUTTER} 90px` }}
        >
          <p
            className="font-script m-0 mb-1.5 text-[clamp(30px,6vw,58px)] font-normal"
            style={{ color: "#f2dcd8" }}
          >
            are getting married
          </p>
          <RomanceNames names={hero.names || "Your names"} />
          {displayDate ? (
            <p className="mt-[26px] text-[15px] tracking-[0.2em] uppercase">
              {displayDate}
            </p>
          ) : null}
          {hero.tagline ? (
            <p className="mx-auto mt-4 max-w-md text-[16px] opacity-90">
              {hero.tagline}
            </p>
          ) : null}
          {hero.showCountdown && hero.date ? (
            <WeddingCountdown weddingDate={hero.date} align="center" onPhoto />
          ) : null}
        </div>
      </header>

      {!pageSlot ? (
        <SectionStack content={content} variant="romance" separator="monogram" />
      ) : null}


      {pageSlot ? (
        <div
          className="mx-auto"
          style={{ maxWidth: "1080px", padding: `48px ${SITE_GUTTER} 64px` }}
        >
          {pageSlot}
        </div>
      ) : null}
    </div>
  );
}
