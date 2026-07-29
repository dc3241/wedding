"use client";

import type { WeddingTemplateProps } from "../template-props";
import { HeroPhotoBackdrop } from "../HeroPhotoBackdrop";
import { OverlayNav } from "../OverlayNav";
import { RegistryCta } from "../RegistryCta";
import { resolveWeddingTheme } from "../themes";
import { formatWeddingDate, splitCoupleNames } from "../template-utils";
import { WeddingCountdown } from "../WeddingCountdown";
import { buildSectionAnchors, SectionStack } from "../sections";
import { SITE_GUTTER } from "../layout";

function EditorialNames({ names }: { names: string }) {
  const parsed = splitCoupleNames(names);
  if (parsed.kind === "pair") {
    return (
      <h1 className="font-serif-display m-0 max-w-[12ch] text-[clamp(56px,12vw,132px)] leading-[0.95] font-medium">
        {parsed.first}
        <br />
        <span style={{ opacity: 0.92 }}>&amp;</span> {parsed.second}
      </h1>
    );
  }
  return (
    <h1 className="font-serif-display m-0 max-w-[12ch] text-[clamp(56px,12vw,132px)] leading-[0.95] font-medium">
      {parsed.text}
    </h1>
  );
}

export function EditorialTemplate({
  content,
  theme,
  registryHref,
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
      <header
        className="relative grid min-h-[74vh] overflow-hidden text-left text-white"
        style={{ placeItems: "center start" }}
      >
        <HeroPhotoBackdrop imageUrl={hero.imageUrl} fallbackTone="editorial" />
        <OverlayNav
          names={hero.names}
          anchors={sectionAnchors}
          registryHref={registryHref}
          homeHref={homeHref}
          showRsvp={showRsvp}
        />
        <div
          className="relative z-10 mx-auto w-full"
          style={{
            maxWidth: "1080px",
            padding: `120px ${SITE_GUTTER} 90px`,
          }}
        >
          <p className="mb-[26px] text-[12px] tracking-[0.28em] uppercase opacity-90">
            {hero.tagline || "The wedding of"}
          </p>
          <EditorialNames names={hero.names || "Your names"} />
          {displayDate ? (
            <p className="mt-[26px] text-[15px] tracking-[0.2em] uppercase">
              {displayDate}
            </p>
          ) : null}
          {hero.showCountdown && hero.date ? (
            <WeddingCountdown weddingDate={hero.date} align="left" onPhoto />
          ) : null}
        </div>
      </header>

      {!pageSlot ? (
        <SectionStack content={content} variant="editorial" separator="monogram" />
      ) : null}

      {!pageSlot && content.registry.visible && registryHref ? (
        <RegistryCta href={registryHref} />
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
