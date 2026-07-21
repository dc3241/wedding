import type { ReactNode } from "react";
import type { WeddingWebsiteContent } from "./types";
import { resolveWeddingTemplate } from "./templates/registry";
import { resolveWeddingTheme } from "./themes";

type WeddingSiteViewProps = {
  content: WeddingWebsiteContent;
  template: string;
  theme: string;
  rsvpSlot?: ReactNode;
};

export function WeddingSiteView({
  content,
  template,
  theme,
  rsvpSlot,
}: WeddingSiteViewProps) {
  const { Component } = resolveWeddingTemplate(template);
  const palette = resolveWeddingTheme(theme);

  return (
    <>
      <Component content={content} theme={theme} />
      {content.rsvp.visible && rsvpSlot ? (
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
