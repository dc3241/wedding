"use client";

import type { WeddingTemplateProps } from "../template-props";
import { HeroPhotoBackdrop } from "../HeroPhotoBackdrop";
import { OverlayNav } from "../OverlayNav";
import { resolveWeddingTheme } from "../themes";
import { WeddingCountdown } from "../WeddingCountdown";
import { buildSectionAnchors, SectionStack } from "../sections";
import { SITE_GUTTER } from "../layout";

function monoDate(date: string) {
  const d = new Date(date + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}.${dd}.${yy}`;
}

export function MinimalistTemplate({
  content,
  theme,
  homeHref,
  pageSlot,
}: WeddingTemplateProps) {
  const palette = resolveWeddingTheme(theme);
  const { hero } = content;
  const monolith = hero.date ? monoDate(hero.date) : null;
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
      <header className="relative grid min-h-[78vh] place-items-center overflow-hidden text-center text-white">
        <HeroPhotoBackdrop imageUrl={hero.imageUrl} fallbackTone="minimal" />
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
          <h1 className="m-0 text-[clamp(22px,4vw,30px)] font-semibold tracking-[0.26em] uppercase">
            {hero.names || "Your names"}
          </h1>
          {monolith ? (
            <p className="font-serif-display m-0 mt-3.5 text-[clamp(56px,13vw,120px)] leading-none font-medium">
              {monolith}
            </p>
          ) : null}
          {hero.tagline ? (
            <p className="mt-[18px] text-[15px] tracking-[0.2em] uppercase opacity-90">
              {hero.tagline}
            </p>
          ) : null}
          {hero.showCountdown && hero.date ? (
            <WeddingCountdown weddingDate={hero.date} align="center" onPhoto />
          ) : null}
        </div>
      </header>

      {!pageSlot ? (
        <SectionStack
          content={content}
          variant="minimalist"
          separator="monogram"
        />
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
