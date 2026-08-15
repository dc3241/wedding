import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-ring bg-surface px-4 py-2.5 text-center text-[13px] font-semibold text-ink md:text-[14px]">
      {children}
    </span>
  );
}

/** Couple-collaboration band — accent-wash raised, NOT a second --deep field. */
export function CoupleCollaboration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-accent-wash px-6 py-10 shadow-raised md:px-10 md:py-12",
        className,
      )}
    >
      <div className="mx-auto max-w-[56ch] text-center">
        <Eyebrow className="mb-4 block">One platform, every detail</Eyebrow>
        <h2 className="text-[28px] font-extrabold tracking-[-0.03em] text-ink md:text-[34px]">
          Bring your couples in — don&apos;t hand them off to five other apps
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted md:text-[16px]">
          Invite each client and their whole wedding lives inside your book: a
          website, a guest list and seating chart, a shared budget, and a
          vendor list they book straight from your preferred roster.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 md:gap-3">
        <Chip>Their own wedding website</Chip>
        <Chip>Book from your preferred vendors</Chip>
        <Chip>Seating &amp; RSVPs stay in your book</Chip>
        <Chip>Everything syncs back, automatically.</Chip>
      </div>

      <p className="mx-auto mt-6 max-w-[48ch] text-center text-[15px] font-medium text-ink md:text-[16px]">
        Most CRMs stop at your desk. This one goes all the way to the ceremony.
      </p>
    </div>
  );
}
