import type { SiteNavAnchor } from "./SiteNav";
import { monogramInitials } from "./template-utils";
import { SITE_GUTTER } from "./layout";
import { cn } from "@/lib/cn";

type OverlayNavProps = {
  names: string;
  anchors?: SiteNavAnchor[];
  homeHref?: string | null;
  showRsvp?: boolean;
  /** Light-on-dark for photo heroes; dark-on-light for secondary pages. */
  tone?: "on-photo" | "on-light";
  align?: "center" | "left";
};

export function OverlayNav({
  names,
  anchors,
  homeHref,
  showRsvp,
  tone = "on-photo",
  align = "center",
}: OverlayNavProps) {
  const initials = monogramInitials(names) || "W";
  const onPhoto = tone === "on-photo";
  const color = onPhoto ? "#ffffff" : "var(--ws-ink)";
  const muted = onPhoto ? "rgba(255,255,255,0.9)" : "var(--ws-muted)";

  return (
    <nav
      className={cn(
        "absolute top-0 right-0 left-0 z-20 flex items-center justify-between",
        align === "left" && "max-w-[1080px]",
      )}
      style={{
        padding: `18px ${SITE_GUTTER}`,
        color,
        ...(align === "left"
          ? { left: "50%", transform: "translateX(-50%)", width: "100%" }
          : {}),
      }}
      aria-label="Site"
    >
      <a
        href={homeHref ?? "#"}
        className="font-serif-display text-[20px] tracking-[0.04em] no-underline"
        style={{ color }}
      >
        {initials.length >= 2 ? (
          <>
            {initials.charAt(0)}{" "}
            <span style={{ opacity: 0.6 }}>&amp;</span> {initials.charAt(1)}
          </>
        ) : (
          initials
        )}
      </a>

      <div className="hidden items-center gap-6 md:flex">
        {homeHref ? (
          <a
            href={homeHref}
            className="text-[12px] tracking-[0.16em] uppercase no-underline"
            style={{ color: muted }}
          >
            Home
          </a>
        ) : null}
        {anchors?.map((anchor) => (
          <a
            key={anchor.id}
            href={`#${anchor.id}`}
            className="text-[12px] tracking-[0.16em] uppercase no-underline"
            style={{ color: muted }}
          >
            {anchor.label}
          </a>
        ))}
      </div>

      {showRsvp ? (
        <a
          href="#rsvp"
          className="rounded-full border px-[18px] py-2 text-[12px] tracking-[0.14em] uppercase no-underline"
          style={{ borderColor: "currentColor", color }}
        >
          RSVP
        </a>
      ) : (
        <span className="w-[88px]" aria-hidden />
      )}
    </nav>
  );
}
