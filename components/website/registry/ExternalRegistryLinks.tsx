import type { ExternalRegistryLink } from "./types";

export function ExternalRegistryLinks({
  links,
}: {
  links: ExternalRegistryLink[];
}) {
  if (links.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2
        className="font-serif-display text-[22px] tracking-[0.005em]"
        style={{ color: "var(--ws-ink)" }}
      >
        Also registered at
      </h2>
      <ul className="flex flex-wrap gap-2.5">
        {links.map((link) => (
          <li key={`${link.label}-${link.url}`}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border px-4 py-2 text-[13px] font-semibold tracking-[0.02em] transition-opacity hover:opacity-80"
              style={{
                borderColor: "var(--ws-border)",
                background: "var(--ws-surface)",
                color: "var(--ws-accent)",
              }}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
