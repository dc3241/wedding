"use client";

import { useEffect, useState } from "react";
import type { WeddingWebsiteContent } from "../types";
import { resolveWeddingTheme } from "../themes";
import { formatWeddingDate } from "../template-utils";
import { cn } from "@/lib/cn";

type ClassicTemplateProps = {
  content: WeddingWebsiteContent;
  theme: string;
};

function daysUntilWedding(weddingDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const wedding = new Date(weddingDate + "T00:00:00");
  wedding.setHours(0, 0, 0, 0);
  const diff = wedding.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function Countdown({ weddingDate }: { weddingDate: string }) {
  const [days, setDays] = useState(() => daysUntilWedding(weddingDate));

  useEffect(() => {
    setDays(daysUntilWedding(weddingDate));
    const interval = window.setInterval(() => {
      setDays(daysUntilWedding(weddingDate));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [weddingDate]);

  return (
    <div className="mt-8 text-center">
      <div
        className="font-serif-display tabnum text-[64px] leading-none"
        style={{ color: "var(--ws-accent)" }}
      >
        {days}
      </div>
      <div className="mt-1.5 text-[13px] tracking-[0.04em]" style={{ color: "var(--ws-muted)" }}>
        days to go
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-serif-display text-[28px] tracking-[0.005em]"
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
    <div>
      <p
        className="text-[12px] font-medium tracking-[0.06em] uppercase"
        style={{ color: "var(--ws-muted)" }}
      >
        {label}
      </p>
      {venue ? (
        <p className="mt-1 text-[16px] font-medium" style={{ color: "var(--ws-ink)" }}>
          {venue}
        </p>
      ) : null}
      {address ? (
        <p className="mt-0.5 text-[15px] whitespace-pre-line" style={{ color: "var(--ws-muted)" }}>
          {address}
        </p>
      ) : null}
      {time ? (
        <p className="mt-1 tabnum text-[15px]" style={{ color: "var(--ws-ink)" }}>
          {time}
        </p>
      ) : null}
    </div>
  );
}

export function ClassicTemplate({ content, theme }: ClassicTemplateProps) {
  const palette = resolveWeddingTheme(theme);
  const { hero, story, details, schedule, travel, registry } = content;
  const displayDate = hero.date ? formatWeddingDate(hero.date) : null;

  return (
    <div
      className="min-h-full font-ws-sans text-[15px] leading-relaxed"
      style={{
        ...palette.cssVars,
        background: "var(--ws-bg)",
        color: "var(--ws-ink)",
      }}
    >
      <div className="mx-auto max-w-[640px] px-6 py-12">
        <header className="pb-10 text-center">
          <div
            className="font-serif-display text-[clamp(40px,6vw,54px)] tracking-[0.005em]"
            style={{ color: "var(--ws-ink)" }}
          >
            {hero.names || "Your names"}
          </div>
          {displayDate ? (
            <div className="tabnum mt-3.5 text-base" style={{ color: "var(--ws-muted)" }}>
              {displayDate}
            </div>
          ) : null}
          {hero.tagline ? (
            <p className="mt-4 text-[16px]" style={{ color: "var(--ws-muted)" }}>
              {hero.tagline}
            </p>
          ) : null}
          {hero.showCountdown && hero.date ? <Countdown weddingDate={hero.date} /> : null}
        </header>

        <div className="mb-10 h-px" style={{ background: "var(--ws-border)" }} aria-hidden />

        {story.visible ? (
          <section className="mb-12 space-y-4">
            <SectionHeading>{story.heading || "Our Story"}</SectionHeading>
            {story.body ? (
              <p className="text-[15px] whitespace-pre-line" style={{ color: "var(--ws-muted)" }}>
                {story.body}
              </p>
            ) : null}
          </section>
        ) : null}

        {details.visible ? (
          <section className="mb-12 space-y-6">
            <SectionHeading>Wedding details</SectionHeading>
            <div className="space-y-6">
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

        {schedule.visible && schedule.items.length > 0 ? (
          <section className="mb-12 space-y-5">
            <SectionHeading>Schedule</SectionHeading>
            <ul className="space-y-4">
              {schedule.items.map((item, index) => (
                <li
                  key={`${item.time}-${item.title}-${index}`}
                  className={cn(
                    "flex gap-4 border-t pt-4 first:border-t-0 first:pt-0",
                  )}
                  style={{ borderColor: "var(--ws-border)" }}
                >
                  {item.time ? (
                    <span
                      className="tabnum w-16 shrink-0 text-[14px] font-medium"
                      style={{ color: "var(--ws-accent)" }}
                    >
                      {item.time}
                    </span>
                  ) : (
                    <span className="w-16 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[16px] font-medium" style={{ color: "var(--ws-ink)" }}>
                      {item.title}
                    </p>
                    {item.description ? (
                      <p className="mt-0.5 text-[14px]" style={{ color: "var(--ws-muted)" }}>
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {travel.visible && travel.body ? (
          <section className="mb-12 space-y-4">
            <SectionHeading>Travel &amp; stay</SectionHeading>
            <p className="text-[15px] whitespace-pre-line" style={{ color: "var(--ws-muted)" }}>
              {travel.body}
            </p>
          </section>
        ) : null}

        {registry.visible && registry.links.length > 0 ? (
          <section className="mb-12 space-y-4">
            <SectionHeading>Registry</SectionHeading>
            <ul className="space-y-2">
              {registry.links.map((link, index) => (
                <li key={`${link.label}-${index}`}>
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[15px] underline-offset-2 hover:underline"
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
