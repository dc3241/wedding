import type { ReactNode } from "react";
import type { WeddingWebsiteContent } from "./types";
import { resolveWeddingTemplate } from "./templates/registry";
import { resolveWeddingTheme } from "./themes";

type WeddingSiteViewProps = {
  content: WeddingWebsiteContent;
  template: string;
  theme: string;
  rsvpSlot?: ReactNode;
  registryHref?: string | null;
  homeHref?: string | null;
  pageSlot?: ReactNode;
};

export function WeddingSiteView({
  content,
  template,
  theme,
  rsvpSlot,
  registryHref,
  homeHref,
  pageSlot,
}: WeddingSiteViewProps) {
  const { Component } = resolveWeddingTemplate(template);
  const palette = resolveWeddingTheme(theme);
  const showRsvp = !pageSlot && content.rsvp.visible && rsvpSlot;

  return (
    <>
      <Component
        content={content}
        theme={theme}
        registryHref={registryHref}
        homeHref={homeHref}
        pageSlot={pageSlot}
      />
      {showRsvp ? (
        <div
          className="font-ws-sans text-[15px] leading-relaxed"
          style={{
            ...palette.cssVars,
            background: "var(--ws-bg)",
            color: "var(--ws-ink)",
          }}
        >
          <section
            id="rsvp"
            className="mx-auto max-w-[640px] border-t px-6 py-12"
            style={{ borderColor: "var(--ws-border)" }}
          >
            <h2
              className="font-serif-display text-[28px] tracking-[0.005em]"
              style={{ color: "var(--ws-ink)" }}
            >
              RSVP
            </h2>
            <div className="mt-6">{rsvpSlot}</div>
          </section>
        </div>
      ) : null}
    </>
  );
}
