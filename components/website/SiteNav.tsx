export type SiteNavAnchor = {
  id: string;
  label: string;
};

type SiteNavProps = {
  /** In-page section anchors (#id) — only visible+non-empty sections. */
  anchors?: SiteNavAnchor[];
  homeHref?: string | null;
  className?: string;
};

export function SiteNav({
  anchors,
  homeHref,
  className,
}: SiteNavProps) {
  const hasAnchors = Boolean(anchors && anchors.length > 0);
  if (!hasAnchors && !homeHref) return null;

  return (
    <nav
      className={
        className ??
        "mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
      }
      aria-label="Site"
    >
      {homeHref ? (
        <a
          href={homeHref}
          className="text-[13px] font-medium tracking-[0.06em] uppercase underline-offset-4 hover:underline"
          style={{ color: "var(--ws-accent)" }}
        >
          Home
        </a>
      ) : null}
      {anchors?.map((anchor) => (
        <a
          key={anchor.id}
          href={`#${anchor.id}`}
          className="text-[13px] font-medium tracking-[0.06em] uppercase underline-offset-4 hover:underline"
          style={{ color: "var(--ws-accent)" }}
        >
          {anchor.label}
        </a>
      ))}
    </nav>
  );
}
