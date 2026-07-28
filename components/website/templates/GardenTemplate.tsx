"use client";

import type { WeddingTemplateProps } from "../template-props";
import { SiteNav } from "../SiteNav";
import { resolveWeddingTheme } from "../themes";
import { formatWeddingDate } from "../template-utils";
import { WeddingCountdown } from "../WeddingCountdown";

function BotanicalMotif({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 32"
      width="80"
      height="32"
      fill="none"
      aria-hidden
    >
      <path
        d="M40 16 C34 10, 26 8, 20 12 C16 14, 14 18, 16 22"
        stroke="var(--ws-accent)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M40 16 C46 10, 54 8, 60 12 C64 14, 66 18, 64 22"
        stroke="var(--ws-accent)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M40 16 L40 26"
        stroke="var(--ws-border)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <ellipse
        cx="18"
        cy="20"
        rx="5"
        ry="8"
        transform="rotate(-35 18 20)"
        stroke="var(--ws-accent)"
        strokeWidth="1"
        fill="var(--ws-tint)"
        fillOpacity="0.5"
      />
      <ellipse
        cx="62"
        cy="20"
        rx="5"
        ry="8"
        transform="rotate(35 62 20)"
        stroke="var(--ws-accent)"
        strokeWidth="1"
        fill="var(--ws-tint)"
        fillOpacity="0.5"
      />
      <circle cx="40" cy="16" r="2" fill="var(--ws-accent)" fillOpacity="0.6" />
    </svg>
  );
}

function BotanicalDivider() {
  return (
    <div className="my-10 flex items-center justify-center gap-5" aria-hidden>
      <div
        className="h-px w-12 max-w-[15vw] sm:w-16"
        style={{ background: "var(--ws-border)" }}
      />
      <BotanicalMotif />
      <div
        className="h-px w-12 max-w-[15vw] sm:w-16"
        style={{ background: "var(--ws-border)" }}
      />
    </div>
  );
}

function CornerFlourish({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden>
      <path
        d="M8 40 C8 28, 16 20, 28 16 C20 24, 16 32, 8 40"
        stroke="var(--ws-accent)"
        strokeWidth="1"
        strokeLinecap="round"
        fill="var(--ws-tint)"
        fillOpacity="0.4"
      />
      <path
        d="M12 36 C14 30, 18 26, 24 22"
        stroke="var(--ws-accent)"
        strokeWidth="0.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-serif-display text-[28px] tracking-[0.01em]"
      style={{ color: "var(--ws-ink)" }}
    >
      {children}
    </h2>
  );
}

function DetailBlock({
  label,
  venue,
  address,
  time,
}: {
  label: string;
  venue: string;
  address: string;
  time: string;
}) {
  if (!venue && !address && !time) return null;

  return (
    <div
      className="rounded-2xl px-5 py-4 text-center"
      style={{ background: "var(--ws-tint)" }}
    >
      <p
        className="text-[12px] font-medium tracking-[0.06em] uppercase"
        style={{ color: "var(--ws-accent-deep)" }}
      >
        {label}
      </p>
      {venue ? (
        <p className="mt-2 text-[16px] font-medium" style={{ color: "var(--ws-ink)" }}>
          {venue}
        </p>
      ) : null}
      {address ? (
        <p className="mt-1 text-[15px] whitespace-pre-line" style={{ color: "var(--ws-muted)" }}>
          {address}
        </p>
      ) : null}
      {time ? (
        <p className="mt-1.5 tabnum text-[15px]" style={{ color: "var(--ws-ink)" }}>
          {time}
        </p>
      ) : null}
    </div>
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
  const { hero, story, details, schedule, travel } = content;
  const displayDate = hero.date ? formatWeddingDate(hero.date) : null;

  const showStory = story.visible;
  const showDetails = details.visible;
  const showSchedule = schedule.visible && schedule.items.length > 0;
  const showTravel = travel.visible && travel.body;

  return (
    <div
      className="relative min-h-full overflow-hidden font-ws-sans text-[15px] leading-relaxed"
      style={{
        ...palette.cssVars,
        background: "var(--ws-bg)",
        color: "var(--ws-ink)",
      }}
    >
      <CornerFlourish className="pointer-events-none absolute top-6 right-6 opacity-40" />
      <CornerFlourish className="pointer-events-none absolute bottom-8 left-6 scale-x-[-1] opacity-30" />

      <div className="mx-auto max-w-[640px] px-6 py-16 sm:py-20">
        <header className="animate-rise text-center">
          <BotanicalMotif className="mx-auto mb-6" />
          <h1
            className="font-serif-display text-[clamp(40px,6vw,54px)] tracking-[0.005em]"
            style={{ color: "var(--ws-ink)" }}
          >
            {hero.names || "Your names"}
          </h1>
          {displayDate ? (
            <p className="tabnum mt-4 text-[15px]" style={{ color: "var(--ws-muted)" }}>
              {displayDate}
            </p>
          ) : null}
          {hero.tagline ? (
            <p className="mx-auto mt-4 max-w-md text-[16px]" style={{ color: "var(--ws-muted)" }}>
              {hero.tagline}
            </p>
          ) : null}
          {hero.showCountdown && hero.date ? (
            <WeddingCountdown weddingDate={hero.date} align="center" />
          ) : null}
          <SiteNav registryHref={registryHref} homeHref={homeHref} />
        </header>

        {!pageSlot ? (
          <>
            <BotanicalDivider />

            {showStory ? (
          <section className="mb-2 space-y-4 text-center">
            <SectionHeading>{story.heading || "Our Story"}</SectionHeading>
            {story.body ? (
              <p
                className="mx-auto max-w-prose text-[15px] whitespace-pre-line"
                style={{ color: "var(--ws-muted)" }}
              >
                {story.body}
              </p>
            ) : null}
          </section>
        ) : null}

        {showStory && (showDetails || showSchedule || showTravel) ? (
          <BotanicalDivider />
        ) : null}

        {showDetails ? (
          <section className="mb-2 space-y-5">
            <div className="text-center">
              <SectionHeading>Wedding details</SectionHeading>
            </div>
            <div className="space-y-4">
              <DetailBlock
                label="Ceremony"
                venue={details.ceremonyVenue}
                address={details.ceremonyAddress}
                time={details.ceremonyTime}
              />
              <DetailBlock
                label="Reception"
                venue={details.receptionVenue}
                address={details.receptionAddress}
                time={details.receptionTime}
              />
            </div>
          </section>
        ) : null}

        {showDetails && (showSchedule || showTravel) ? (
          <BotanicalDivider />
        ) : null}

        {showSchedule ? (
          <section className="mb-2 space-y-6">
            <div className="text-center">
              <SectionHeading>Schedule</SectionHeading>
            </div>
            <ul className="mx-auto max-w-md space-y-3">
              {schedule.items.map((item, index) => (
                <li
                  key={`${item.time}-${item.title}-${index}`}
                  className="rounded-xl px-4 py-3 text-center"
                  style={{ background: "var(--ws-surface)", border: "1px solid var(--ws-border)" }}
                >
                  {item.time ? (
                    <p
                      className="tabnum text-[13px] font-medium"
                      style={{ color: "var(--ws-accent)" }}
                    >
                      {item.time}
                    </p>
                  ) : null}
                  <p className="mt-1 text-[16px] font-medium" style={{ color: "var(--ws-ink)" }}>
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="mt-0.5 text-[14px]" style={{ color: "var(--ws-muted)" }}>
                      {item.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {showSchedule && showTravel ? <BotanicalDivider /> : null}

        {showTravel ? (
          <section className="mb-2 space-y-4 text-center">
            <SectionHeading>Travel &amp; stay</SectionHeading>
            <p
              className="mx-auto max-w-prose rounded-2xl px-5 py-4 text-[15px] whitespace-pre-line"
              style={{ background: "var(--ws-tint)", color: "var(--ws-muted)" }}
            >
              {travel.body}
            </p>
          </section>
        ) : null}
          </>
        ) : null}
      </div>

      {pageSlot ? (
        <div className="mx-auto max-w-5xl px-6 pb-16">{pageSlot}</div>
      ) : null}
    </div>
  );
}
