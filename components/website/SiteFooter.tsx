import { monogramInitials, formatWeddingDate } from "./template-utils";
import { SITE_GUTTER } from "./layout";

type SiteFooterProps = {
  names: string;
  date?: string;
};

export function SiteFooter({ names, date }: SiteFooterProps) {
  const initials = monogramInitials(names);
  const displayDate = date ? formatWeddingDate(date) : null;

  return (
    <footer
      className="text-center font-ws-sans"
      style={{
        background: "var(--ws-ink)",
        color: "#ffffff",
        padding: `64px ${SITE_GUTTER}`,
      }}
    >
      {initials ? (
        <div
          className="mx-auto mb-5 flex size-[58px] items-center justify-center rounded-full font-serif-display text-[22px]"
          style={{
            border: "1px solid rgba(255,255,255,0.4)",
            background: "transparent",
            color: "#ffffff",
          }}
          aria-hidden
        >
          {initials}
        </div>
      ) : null}
      <p className="font-serif-display m-0 text-[30px]">
        {names.trim() || "Your names"}
      </p>
      {displayDate ? (
        <p
          className="mt-1.5 text-[12px] tracking-[0.2em] uppercase"
          style={{ opacity: 0.6 }}
        >
          {displayDate}
        </p>
      ) : null}
    </footer>
  );
}
