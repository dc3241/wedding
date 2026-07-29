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
import { cn } from "@/lib/cn";

function ClassicNames({ names }: { names: string }) {
  const parsed = splitCoupleNames(names);
  if (parsed.kind === "pair") {
    return (
      <h1 className="font-serif-display m-0 text-[clamp(52px,11vw,120px)] leading-[0.98] font-medium [text-shadow:0_2px_30px_rgba(0,0,0,.25)]">
        {parsed.first}
        <span className="mx-[0.12em] italic" style={{ color: "#f3e7d6" }}>
          &amp;
        </span>
        {parsed.second}
      </h1>
    );
  }
  return (
    <h1 className="font-serif-display m-0 text-[clamp(52px,11vw,120px)] leading-[0.98] font-medium [text-shadow:0_2px_30px_rgba(0,0,0,.25)]">
      {parsed.text}
    </h1>
  );
}

export function ClassicTemplate({
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
        className={cn(
          "relative grid place-items-center overflow-hidden text-center text-white",
          pageSlot ? "min-h-[42vh]" : "min-h-screen",
        )}
      >
        <HeroPhotoBackdrop imageUrl={hero.imageUrl} fallbackTone="warm" />
        <OverlayNav
          names={hero.names}
          anchors={sectionAnchors}
          registryHref={registryHref}
          homeHref={homeHref}
          showRsvp={showRsvp}
        />
        <div
          className="relative z-10"
          style={{ padding: `120px ${SITE_GUTTER} 90px` }}
        >
          {hero.tagline ? (
            <p className="mb-[26px] text-[12px] tracking-[0.28em] uppercase opacity-90">
              {hero.tagline}
            </p>
          ) : (
            <p className="mb-[26px] text-[12px] tracking-[0.28em] uppercase opacity-90">
              Together with their families
            </p>
          )}
          <ClassicNames names={hero.names || "Your names"} />
          {displayDate ? (
            <p className="mt-[26px] text-[15px] tracking-[0.2em] uppercase">
              {displayDate}
            </p>
          ) : null}
          {hero.showCountdown && hero.date ? (
            <WeddingCountdown weddingDate={hero.date} align="center" onPhoto />
          ) : null}
        </div>
      </header>

      {!pageSlot ? (
        <SectionStack content={content} variant="classic" separator="monogram" />
      ) : null}

      {!pageSlot && content.registry.visible && registryHref ? (
        <RegistryCta href={registryHref} />
      ) : null}

      {pageSlot ? (
        <div
          className="mx-auto"
          style={{
            maxWidth: "1080px",
            padding: `48px ${SITE_GUTTER} 64px`,
          }}
        >
          {pageSlot}
        </div>
      ) : null}
    </div>
  );
}
