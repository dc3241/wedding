import { Eyebrow } from "@/components/ui/eyebrow";
import type { ReactNode } from "react";

export function AudienceSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        className ?? "mx-auto max-w-6xl px-6 py-14 md:px-10 md:py-16"
      }
    >
      {children}
    </section>
  );
}

export function AudienceCopyHeader({
  eyebrow,
  title,
  subhead,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subhead: string;
  align?: "center" | "left";
}) {
  return (
    <div
      className={
        align === "center" ? "mx-auto max-w-[52ch] text-center" : "max-w-[52ch]"
      }
    >
      <Eyebrow className="mb-4 block">{eyebrow}</Eyebrow>
      <h2 className="text-[32px] font-extrabold tracking-[-0.03em] text-ink md:text-[42px]">
        {title}
      </h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted md:text-[16px]">
        {subhead}
      </p>
    </div>
  );
}

function ChangeArrow() {
  return (
    <span className="my-2 inline-flex text-accent" aria-hidden>
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 4v12M6 12l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function BeforeAfterStrip({
  items,
}: {
  items: readonly { label: string; before: string; after: string }[];
}) {
  return (
    <>
      <Eyebrow className="mb-8 block text-center">What changes</Eyebrow>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        {items.map((change) => (
          <article
            key={change.label}
            className="flex flex-col rounded-[var(--radius-card)] bg-surface p-6 shadow-raised"
          >
            <Eyebrow className="mb-4 block">{change.label}</Eyebrow>
            <p className="text-[14px] leading-relaxed text-muted md:text-[15px]">
              {change.before}
            </p>
            <ChangeArrow />
            <p className="text-[15px] font-medium leading-relaxed text-ink">
              {change.after}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
