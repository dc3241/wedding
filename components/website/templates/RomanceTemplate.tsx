"use client";

import type { WeddingWebsiteContent } from "../types";
import { resolveWeddingTheme } from "../themes";
import { formatWeddingDate, splitCoupleNames } from "../template-utils";
import { WeddingCountdown } from "../WeddingCountdown";

type RomanceTemplateProps = {
  content: WeddingWebsiteContent;
  theme: string;
};

function OrnamentDivider() {
  return (
    <div className="my-12 flex items-center justify-center gap-4" aria-hidden>
      <div
        className="h-px w-16 max-w-[20vw] sm:w-24"
        style={{ background: "var(--ws-border)" }}
      />
      <div
        className="size-1.5 shrink-0 rotate-45"
        style={{ background: "var(--ws-accent)" }}
      />
      <div
        className="h-px w-16 max-w-[20vw] sm:w-24"
        style={{ background: "var(--ws-border)" }}
      />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-serif-display text-[26px] tracking-[0.01em]"
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
    <div className="text-center">
      <p
        className="text-[12px] font-medium tracking-[0.06em] uppercase"
        style={{ color: "var(--ws-muted)" }}
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

function CoupleHero({ names }: { names: string }) {
  const parsed = splitCoupleNames(names);

  if (parsed.kind === "pair") {
    return (
      <div className="space-y-1">
        <p
          className="font-serif-display text-[clamp(36px,6vw,52px)] leading-none tracking-[0.005em]"
          style={{ color: "var(--ws-ink)" }}
        >
          {parsed.first}
        </p>
        <p
          className="font-serif-display text-[clamp(52px,9vw,80px)] italic leading-none"
          style={{ color: "var(--ws-accent)" }}
          aria-hidden
        >
          &amp;
        </p>
        <p
          className="font-serif-display text-[clamp(36px,6vw,52px)] leading-none tracking-[0.005em]"
          style={{ color: "var(--ws-ink)" }}
        >
          {parsed.second}
        </p>
      </div>
    );
  }

  return (
    <div
      className="font-serif-display text-[clamp(40px,6vw,54px)] tracking-[0.005em]"
      style={{ color: "var(--ws-ink)" }}
    >
      {parsed.text}
    </div>
  );
}

export function RomanceTemplate({ content, theme }: RomanceTemplateProps) {
  const palette = resolveWeddingTheme(theme);
  const { hero, story, details, schedule, travel, registry } = content;
  const displayDate = hero.date ? formatWeddingDate(hero.date) : null;

  const showStory = story.visible;
  const showDetails = details.visible;
  const showSchedule = schedule.visible && schedule.items.length > 0;
  const showTravel = travel.visible && travel.body;
  const showRegistry = registry.visible && registry.links.length > 0;

  return (
    <div
      className="min-h-full font-ws-sans text-[15px] leading-relaxed"
      style={{
        ...palette.cssVars,
        background: "var(--ws-bg)",
        color: "var(--ws-ink)",
      }}
    >
      <div className="mx-auto max-w-[640px] px-6 py-14 sm:py-16">
        <header className="animate-rise pb-4 text-center">
          <CoupleHero names={hero.names} />
          <p
            className="font-script mt-5 text-[clamp(28px,5vw,36px)]"
            style={{ color: "var(--ws-accent-deep)" }}
          >
            are getting married
          </p>
          {displayDate ? (
            <p className="tabnum mt-6 text-[15px]" style={{ color: "var(--ws-muted)" }}>
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
        </header>

        <OrnamentDivider />

        {showStory ? (
          <section className="mb-4 space-y-4 text-center">
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

        {showStory && (showDetails || showSchedule || showTravel || showRegistry) ? (
          <OrnamentDivider />
        ) : null}

        {showDetails ? (
          <section className="mb-4 space-y-8">
            <div className="text-center">
              <SectionHeading>Wedding details</SectionHeading>
            </div>
            <div className="space-y-8">
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

        {showDetails && (showSchedule || showTravel || showRegistry) ? (
          <OrnamentDivider />
        ) : null}

        {showSchedule ? (
          <section className="mb-4 space-y-6">
            <div className="text-center">
              <SectionHeading>Schedule</SectionHeading>
            </div>
            <ul className="mx-auto max-w-md space-y-5">
              {schedule.items.map((item, index) => (
                <li key={`${item.time}-${item.title}-${index}`} className="text-center">
                  {item.time ? (
                    <p
                      className="tabnum text-[14px] font-medium"
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

        {showSchedule && (showTravel || showRegistry) ? <OrnamentDivider /> : null}

        {showTravel ? (
          <section className="mb-4 space-y-4 text-center">
            <SectionHeading>Travel &amp; stay</SectionHeading>
            <p
              className="mx-auto max-w-prose text-[15px] whitespace-pre-line"
              style={{ color: "var(--ws-muted)" }}
            >
              {travel.body}
            </p>
          </section>
        ) : null}

        {showTravel && showRegistry ? <OrnamentDivider /> : null}

        {showRegistry ? (
          <section className="mb-4 space-y-4 text-center">
            <SectionHeading>Registry</SectionHeading>
            <ul className="space-y-2">
              {registry.links.map((link, index) => (
                <li key={`${link.label}-${index}`}>
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[15px] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{ color: "var(--ws-accent)" }}
                    >
                      {link.label || link.url}
                    </a>
                  ) : (
                    <span style={{ color: "var(--ws-muted)" }}>{link.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
