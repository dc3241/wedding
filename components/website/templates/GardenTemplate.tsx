"use client";

import type { WeddingTemplateProps } from "../template-props";
import { HeroPhotoBackdrop } from "../HeroPhotoBackdrop";
import { OverlayNav } from "../OverlayNav";
import { RegistryCta } from "../RegistryCta";
import { resolveWeddingTheme } from "../themes";
import { formatWeddingDate } from "../template-utils";
import { WeddingCountdown } from "../WeddingCountdown";
import { buildSectionAnchors, SectionStack } from "../sections";
import { SITE_GUTTER } from "../layout";

function CornerFlourish({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      width="48"
      height="48"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 40 C8 28, 16 20, 28 16 C20 24, 16 32, 8 40"
        stroke="var(--ws-accent)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity={0.75}
      />
      <path
        d="M12 36 C14 30, 18 26, 24 22"
        stroke="var(--ws-accent)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity={0.75}
      />
    </svg>
  );
}

function BotanicalMotif({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 32"
      width="46"
      height="24"
      fill="none"
      aria-hidden
    >
      <path
        d="M40 16 C34 10, 26 8, 20 12 C16 14, 14 18, 16 22"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.85}
      />
      <path
        d="M40 16 C46 10, 54 8, 60 12 C64 14, 66 18, 64 22"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.85}
      />
      <path
        d="M40 16 L40 26"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.85}
      />
      <circle cx="40" cy="16" r="2" fill="currentColor" fillOpacity="0.7" />
    </svg>
  );
}

export function GardenTemplate({
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
      className="relative min-h-full overflow-hidden font-ws-sans text-[17px] leading-relaxed"
      style={{
        ...palette.cssVars,
        background: "var(--ws-bg)",
        color: "var(--ws-ink)",
      }}
    >
      <CornerFlourish className="pointer-events-none absolute top-6 right-6 z-30 opacity-70" />
      <CornerFlourish className="pointer-events-none absolute bottom-8 left-6 z-30 scale-x-[-1] opacity-50" />

      <header className="relative grid min-h-screen place-items-center overflow-hidden text-center text-white">
        <HeroPhotoBackdrop imageUrl={hero.imageUrl} fallbackTone="garden" />
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
          <BotanicalMotif className="mx-auto mb-6 text-white" />
          <h1 className="font-serif-display m-0 text-[clamp(52px,11vw,120px)] leading-[0.98] font-medium">
            {hero.names || "Your names"}
          </h1>
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
        <SectionStack content={content} variant="garden" separator="monogram" />
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
