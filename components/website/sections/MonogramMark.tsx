import { monogramInitials } from "../template-utils";
import type { SectionVariant } from "./section-meta";
import { cn } from "@/lib/cn";

type MonogramMarkProps = {
  names: string;
  variant?: SectionVariant;
  className?: string;
};

/** Circular monogram interstitial — initials from hero.names (mockup `.mono`). */
export function MonogramMark({
  names,
  variant = "classic",
  className,
}: MonogramMarkProps) {
  const initials = monogramInitials(names);
  if (!initials) return null;

  return (
    <div
      className={cn("flex justify-center py-[52px]", className)}
      aria-hidden
    >
      <div
        className={cn(
          "flex size-[58px] items-center justify-center rounded-full font-serif-display text-[22px]",
          variant === "romance" && "italic",
        )}
        style={{
          border: "1px solid var(--ws-accent)",
          color: "var(--ws-accent-deep)",
          background: "var(--ws-surface)",
        }}
      >
        {initials}
      </div>
    </div>
  );
}
