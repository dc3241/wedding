type SiteNavProps = {
  registryHref?: string | null;
  homeHref?: string | null;
  className?: string;
};

export function SiteNav({ registryHref, homeHref, className }: SiteNavProps) {
  if (!registryHref && !homeHref) return null;

  return (
    <nav
      className={className ?? "mt-6 flex flex-wrap items-center justify-center gap-5"}
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
      {registryHref ? (
        <a
          href={registryHref}
          className="text-[13px] font-medium tracking-[0.06em] uppercase underline-offset-4 hover:underline"
          style={{ color: "var(--ws-accent)" }}
        >
          Registry
        </a>
      ) : null}
    </nav>
  );
}
